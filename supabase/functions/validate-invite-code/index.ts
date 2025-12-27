import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      console.log('Invalid request: missing or invalid code');
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating invite code...');

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Query the invite code
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('invite_codes')
      .select('id, code, max_uses, current_uses, is_active, expires_at')
      .eq('code', code)
      .eq('is_active', true)
      .maybeSingle();

    if (codeError) {
      console.error('Database error:', codeError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Failed to validate invite code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!codeData) {
      console.log('Invite code not found or inactive');
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid or expired invite code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max uses
    if (codeData.max_uses && codeData.current_uses !== null && codeData.current_uses >= codeData.max_uses) {
      console.log('Invite code has reached maximum uses');
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite code has reached maximum uses' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      console.log('Invite code has expired');
      return new Response(
        JSON.stringify({ valid: false, error: 'Invite code has expired' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Invite code is valid');
    return new Response(
      JSON.stringify({ 
        valid: true, 
        codeId: codeData.id,
        currentUses: codeData.current_uses || 0
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
