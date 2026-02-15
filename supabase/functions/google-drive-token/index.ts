import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// AES-256-GCM decryption utility
async function decrypt(encryptedBase64: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decode base64
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedData
  );
  
  return new TextDecoder().decode(decrypted);
}

// AES-256-GCM encryption utility
async function encrypt(text: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get secrets
    const GOOGLE_CLIENT_ID = Deno.env.get('VITE_GOOGLE_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !ENCRYPTION_KEY) {
      console.error('[google-drive-token] Missing required secrets');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('[google-drive-token] JWT validation failed:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Use service role to get connection (bypasses RLS for reading)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get connection from database
    const { data: connection, error: selectError } = await supabaseAdmin
      .from('google_drive_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (selectError) {
      console.error('[google-drive-token] Database error:', selectError);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connection) {
      return new Response(
        JSON.stringify({ error: 'No active connection', connected: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenExpiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    
    // Check if token needs refresh (within 5 minutes of expiry)
    if (tokenExpiresAt.getTime() - now.getTime() < 300000) {
      console.log('[google-drive-token] Token expired or expiring, refreshing...');
      
      // Decrypt refresh token
      const refreshToken = await decrypt(connection.refresh_token, ENCRYPTION_KEY);
      
      // Refresh the token with Google
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshResponse.json();

      if (refreshData.error) {
        console.error('[google-drive-token] Refresh failed:', refreshData.error);
        
        // If refresh fails, mark connection as inactive
        await supabaseAdmin
          .from('google_drive_connections')
          .update({ is_active: false })
          .eq('user_id', userId);
          
        return new Response(
          JSON.stringify({ 
            error: 'Token refresh failed. Please reconnect Google Drive.', 
            connected: false 
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { access_token: newAccessToken, expires_in } = refreshData;
      
      // Encrypt new access token
      const encryptedAccessToken = await encrypt(newAccessToken, ENCRYPTION_KEY);
      const newExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

      // Update database
      await supabaseAdmin
        .from('google_drive_connections')
        .update({
          access_token: encryptedAccessToken,
          token_expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      console.log('[google-drive-token] Token refreshed successfully');

      return new Response(
        JSON.stringify({ 
          access_token: newAccessToken, 
          connected: true,
          email: connection.email,
          expires_at: newExpiresAt
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Token is still valid, decrypt and return
    const accessToken = await decrypt(connection.access_token, ENCRYPTION_KEY);

    return new Response(
      JSON.stringify({ 
        access_token: accessToken, 
        connected: true,
        email: connection.email,
        expires_at: connection.token_expires_at
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[google-drive-token] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
