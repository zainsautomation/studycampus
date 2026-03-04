import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// AES-256-GCM encryption utilities
async function encrypt(text: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // Derive a proper 256-bit key from the provided key
  const keyData = encoder.encode(key.padEnd(32, '0').slice(0, 32));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  // Combine IV + encrypted data and base64 encode
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
    const { code, redirect_uri } = await req.json();

    if (!code || !redirect_uri) {
      return new Response(
        JSON.stringify({ error: 'Missing code or redirect_uri' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get secrets
    const GOOGLE_CLIENT_ID = Deno.env.get('VITE_GOOGLE_CLIENT_ID') || Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !ENCRYPTION_KEY) {
      console.error('Missing required secrets');
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
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      console.error('[google-drive-auth] JWT validation failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log(`[google-drive-auth] Processing OAuth for user: ${userId}`);

    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('[google-drive-auth] Google token error:', tokenData.error);
      return new Response(
        JSON.stringify({ error: tokenData.error_description || 'Failed to get tokens from Google' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
      console.error('[google-drive-auth] Missing tokens in response');
      return new Response(
        JSON.stringify({ error: 'Failed to get refresh token. Make sure to use access_type=offline and prompt=consent.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoResponse.json();
    const email = userInfo.email || null;

    console.log(`[google-drive-auth] Got tokens for: ${email}`);

    // Encrypt tokens
    const encryptedAccessToken = await encrypt(access_token, ENCRYPTION_KEY);
    const encryptedRefreshToken = await encrypt(refresh_token, ENCRYPTION_KEY);

    // Calculate expiry
    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Upsert connection
    const { error: upsertError } = await supabaseAdmin
      .from('google_drive_connections')
      .upsert({
        user_id: userId,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        email,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error('[google-drive-auth] Database error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save connection' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[google-drive-auth] Connection saved for user: ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        email,
        message: 'Google Drive connected permanently' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[google-drive-auth] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
