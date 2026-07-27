import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codeId } = await req.json();

    if (!codeId || typeof codeId !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Code ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Atomic increment via SECURITY DEFINER RPC — prevents race conditions
    // where two concurrent redemptions both pass the max_uses check.
    const { data: ok, error } = await supabaseAdmin.rpc('increment_invite_code_usage', {
      _code_id: codeId,
    });

    if (error) {
      console.error('increment_invite_code_usage failed:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to use invite code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invite code is no longer valid' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('use-invite-code error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
