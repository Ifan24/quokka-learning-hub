
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, amount } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get current credits
    const { data: credits, error: creditsError } = await supabase
      .from('credits')
      .select('amount')
      .eq('user_id', user_id)
      .single()

    if (creditsError) throw creditsError
    if (!credits) throw new Error('No credits found for user')
    if (credits.amount < amount) throw new Error('Insufficient credits')

    // Update credits
    const { error: updateError } = await supabase
      .from('credits')
      .update({ amount: credits.amount - amount })
      .eq('user_id', user_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, remaining: credits.amount - amount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
