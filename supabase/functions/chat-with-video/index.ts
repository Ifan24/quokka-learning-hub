
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { fal } from 'npm:@fal-ai/client'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { question, transcription } = await req.json()

    if (!question || !transcription) {
      throw new Error('Missing required parameters')
    }

    // Initialize FAL client
    fal.config({
      credentials: Deno.env.get('FAL_API_KEY'),
    })

    const prompt = `Based on the following video transcription, answer the question.
    
Transcription:
${transcription}

Question: ${question}

Please provide a clear and concise answer based solely on the information provided in the transcription.`

    console.log('Sending request to FAL AI...')
    const result = await fal.subscribe("fal-ai/any-llm", {
      input: {
        model: "anthropic/claude-3.5-sonnet",
        prompt: prompt,
        reasoning: false
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      }
    })

    console.log('Received response from FAL AI:', result)

    return new Response(
      JSON.stringify({ success: true, output: result.data.output }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    )

  } catch (error) {
    console.error('Chat error:', error)
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
