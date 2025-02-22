
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { fal } from 'npm:@fal-ai/client'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

fal.config({
  credentials: Deno.env.get('FAL_API_KEY'),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { videoId, signedUrl } = await req.json()

    if (!videoId || !signedUrl) {
      throw new Error('Missing required parameters')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update status to processing
    await supabase
      .from('videos')
      .update({ transcription_status: 'processing' })
      .eq('id', videoId)

    // Download video file
    const videoResponse = await fetch(signedUrl)
    const videoBuffer = await videoResponse.arrayBuffer()

    // Convert to audio using FFmpeg (in web worker)
    const audioBlob = await convertToAudio(videoBuffer)

    // Upload audio file to Supabase
    const audioFileName = `${crypto.randomUUID()}.mp3`
    const { error: uploadError } = await supabase.storage
      .from('audio')
      .upload(audioFileName, audioBlob, {
        contentType: 'audio/mp3',
        cacheControl: '3600'
      })

    if (uploadError) throw uploadError

    // Get signed URL for the audio file
    const { data: audioData } = await supabase.storage
      .from('audio')
      .createSignedUrl(audioFileName, 3600)

    if (!audioData?.signedUrl) {
      throw new Error('Failed to get audio URL')
    }

    // Call FAL API for transcription
    console.log('Starting transcription with FAL API...')
    const result = await fal.subscribe('fal-ai/wizper', {
      input: {
        audio_url: audioData.signedUrl
      },
    })

    console.log('Transcription completed:', result)

    // Update video record with transcription data
    const { error: updateError } = await supabase
      .from('videos')
      .update({
        transcription_status: 'completed',
        transcription_text: result.text,
        transcription_chunks: result.chunks,
        audio_file_path: audioFileName
      })
      .eq('id', videoId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Transcription error:', error)
    
    // Update status to failed if we have the videoId
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
