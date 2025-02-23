
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
    const { videoId, signedUrl } = await req.json()
    
    if (!videoId || !signedUrl) {
      throw new Error('Missing required parameters')
    }

    // Download video content
    const videoResponse = await fetch(signedUrl)
    const videoBlob = await videoResponse.blob()

    // Create form data for OpenAI API
    const formData = new FormData()
    formData.append('file', videoBlob, 'video.mp4')
    formData.append('model', 'whisper-1')
    formData.append('response_format', 'json')

    // Send to OpenAI for transcription
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    })

    const transcriptionResult = await response.json()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update video with transcription
    const { error: updateError } = await supabaseClient
      .from('videos')
      .update({
        transcription_text: transcriptionResult.text,
        transcription_status: 'completed'
      })
      .eq('id', videoId)

    if (updateError) {
      throw updateError
    }

    // Trigger description generation
    try {
      const descriptionResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-description`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId,
            transcriptionText: transcriptionResult.text,
          }),
        }
      )

      if (!descriptionResponse.ok) {
        console.error('Error generating description:', await descriptionResponse.text())
      }
    } catch (descError) {
      console.error('Error calling description generation:', descError)
      // Continue even if description generation fails
    }

    console.log(`Completed transcription for video ${videoId}`)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in transcribe-video function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
