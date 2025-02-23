
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoId, transcriptionText } = await req.json()

    if (!videoId || !transcriptionText) {
      throw new Error('Missing required parameters')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate description using Fal API
    const response = await fetch('https://rest.fal.ai/fal/instant/anthropic/claude-3.5-sonnet', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${Deno.env.get('FAL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt: `You are a helpful assistant that generates concise video descriptions based on transcripts. Keep descriptions under 200 words and focus on key points.

Generate a clear and concise description for a video based on this transcript:

${transcriptionText}`
        }
      }),
    })

    const data = await response.json()
    const generatedDescription = data.response

    // Update video description in the database
    const { error: updateError } = await supabaseClient
      .from('videos')
      .update({ description: generatedDescription })
      .eq('id', videoId)

    if (updateError) {
      throw updateError
    }

    console.log(`Generated and updated description for video ${videoId}`)

    return new Response(
      JSON.stringify({ success: true, description: generatedDescription }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in generate-description function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
