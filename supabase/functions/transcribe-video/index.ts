
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { fal } from 'npm:@fal-ai/client'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { videoId, signedUrl } = await req.json()

    if (!videoId || !signedUrl) {
      throw new Error('Missing required parameters')
    }

    // Initialize FAL client
    fal.config({
      credentials: Deno.env.get('FAL_API_KEY'),
    })

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update status to processing
    await supabase
      .from('videos')
      .update({ transcription_status: 'processing' })
      .eq('id', videoId)

    // Start transcription
    console.log('Starting transcription with FAL API...')
    const result = await fal.subscribe('fal-ai/wizper', {
      input: {
        audio_url: signedUrl
      },
    })

    console.log('Transcription completed:', result)

    // Update video record with transcription data
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        transcription_status: 'completed',
        transcription_text: result.text,
        transcription_chunks: result.chunks
      })
      .eq('id', videoId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, result }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Transcription error:', error)
    
    try {
      const { videoId } = await req.json()
      if (videoId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        await supabase
          .from('videos')
          .update({ transcription_status: 'failed' })
          .eq('id', videoId)
      }
    } catch (e) {
      console.error('Error updating video status:', e)
    }

    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
