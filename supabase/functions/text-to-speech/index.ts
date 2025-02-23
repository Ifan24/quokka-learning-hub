
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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

    // Use the same voice ID as in the example
    const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

    // Make direct API call to ElevenLabs
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'accept': 'audio/mpeg',
        'content-type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('ElevenLabs API error:', error)
      throw new Error(error.detail?.message || 'Failed to generate speech')
    }

    // Get the audio data as ArrayBuffer
    const audioBuffer = await response.arrayBuffer()
    console.log('Audio buffer size:', audioBuffer.byteLength, 'bytes')

    // Convert ArrayBuffer to Base64
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
