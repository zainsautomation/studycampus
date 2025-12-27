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
    const { codeId, currentUses } = await req.json();

    if (!codeId || typeof codeId !== 'string') {
      console.log('Invalid request: missing codeId');
      return new Response(
        JSON.stringify({ success: false, error: 'Code ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Incrementing invite code usage for:', codeId);

    // Create Supabase client with service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Increment the usage count
    const newUsageCount = (currentUses || 0) + 1;
    const { error: updateError } = await supabaseAdmin
      .from('invite_codes')
      .update({ current_uses: newUsageCount })
      .eq('id', codeId)
      .eq('is_active', true);

    if (updateError) {
      console.error('Failed to increment usage:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to use invite code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully incremented invite code usage');
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
