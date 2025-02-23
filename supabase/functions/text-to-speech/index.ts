
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { ElevenLabsClient } from 'npm:elevenlabs@0.1.0'

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
    console.log('API Key length:', apiKey.length) // Log the length to verify we have a key

    const client = new ElevenLabsClient({
      apiKey: apiKey
    })

    // First verify the API key is working by getting available voices
    try {
      const voices = await client.voices.getAll()
      console.log('Successfully verified API key, found voices:', voices.length)
    } catch (error) {
      console.error('Failed to verify API key:', error)
      throw new Error('Invalid API key or API key verification failed')
    }

    const response = await client.textToSpeech.convert(
      "JBFqnCBsd6RMkjVDRZzb", // George voice
      {
        output_format: "mp3_44100_128",
        text: text,
        model_id: "eleven_multilingual_v2"
      }
    )

    if (!response) {
      throw new Error('Failed to generate speech')
    }

    // Convert ArrayBuffer to base64
    const buffer = await response.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(buffer)))

    console.log('Successfully generated speech')

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
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
