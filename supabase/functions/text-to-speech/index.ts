
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { ElevenLabsClient } from "npm:elevenlabs@1.51.0"

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
    const { text } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    const apiKey = Deno.env.get('ELEVEN_LABS_API_KEY')
    if (!apiKey) {
      throw new Error('ElevenLabs API key is not configured')
    }

    console.log('Generating speech for text:', text)

    const client = new ElevenLabsClient({
      apiKey: apiKey
    })

    // Get the audio buffer directly from the API
    const audioBuffer = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
      output_format: "mp3_44100_128",
      text: text,
      model_id: "eleven_multilingual_v2"
    })

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.error('No audio data received from ElevenLabs')
      throw new Error('Failed to generate speech')
    }

    console.log('Audio buffer size:', audioBuffer.byteLength, 'bytes')

    // Convert to base64 using Buffer for larger audio files
    const uint8Array = new Uint8Array(audioBuffer)
    const chunks = []
    const chunkSize = 8192
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      chunks.push(String.fromCharCode.apply(null, uint8Array.slice(i, i + chunkSize)))
    }
    
    const base64Audio = btoa(chunks.join(''))

    console.log('Successfully generated speech, base64 length:', base64Audio.length)

    return new Response(
      JSON.stringify({ 
        audioContent: base64Audio,
        size: audioBuffer.byteLength
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error generating speech:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
