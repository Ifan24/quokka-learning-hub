
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

    // Remove any whitespace from the API key
    const cleanApiKey = apiKey.trim()
    
    console.log('Generating speech for text:', text)
    console.log('API Key starts with:', cleanApiKey.substring(0, 4)) // Log first few chars to verify format

    // Direct API call to test the key
    const testResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'Accept': 'application/json',
        'xi-api-key': cleanApiKey
      }
    })

    if (!testResponse.ok) {
      const error = await testResponse.text()
      console.error('API Key validation failed:', error)
      throw new Error('Invalid API key')
    }

    const client = new ElevenLabsClient({
      apiKey: cleanApiKey
    })

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
