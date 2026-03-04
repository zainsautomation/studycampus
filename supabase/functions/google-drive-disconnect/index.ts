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
  
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedData
  );
  
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

    if (!ENCRYPTION_KEY) {
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
      console.error('[google-drive-disconnect] JWT validation failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;
    console.log(`[google-drive-disconnect] Disconnecting for user: ${userId}`);

    // Use service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get connection to revoke token
    const { data: connection } = await supabaseAdmin
      .from('google_drive_connections')
      .select('refresh_token')
      .eq('user_id', userId)
      .maybeSingle();

    if (connection?.refresh_token) {
      try {
        // Decrypt and revoke refresh token with Google
        const refreshToken = await decrypt(connection.refresh_token, ENCRYPTION_KEY);
        
        await fetch(`https://oauth2.googleapis.com/revoke?token=${refreshToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        console.log('[google-drive-disconnect] Token revoked with Google');
      } catch (revokeError) {
        console.warn('[google-drive-disconnect] Failed to revoke token with Google:', revokeError);
        // Continue anyway - we still want to delete from our database
      }
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('google_drive_connections')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[google-drive-disconnect] Database error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to disconnect' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[google-drive-disconnect] Connection removed for user: ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Google Drive disconnected' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[google-drive-disconnect] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
