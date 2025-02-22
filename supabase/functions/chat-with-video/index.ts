
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

    console.log('Request received:', { question });

    // Initialize FAL client
    const apiKey = Deno.env.get('FAL_API_KEY');
    if (!apiKey) {
      throw new Error('FAL_API_KEY is not configured');
    }

    fal.config({
      credentials: apiKey,
    })

    const prompt = `Based on the following video transcription, answer the question.
    
Transcription:
${transcription}

Question: ${question}

Please provide a clear and concise answer based solely on the information provided in the transcription.`

    console.log('Starting FAL AI stream...');

    // Create a TransformStream for streaming the response
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // Start the streaming response
    const response = new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      },
    })

    // Process the stream in the background
    const processStream = async () => {
      try {
        console.log('Initializing FAL AI stream...');
        const stream = await fal.stream("fal-ai/any-llm", {
          input: {
            model: "anthropic/claude-3.5-sonnet",
            prompt: prompt,
            reasoning: false
          }
        });

        console.log('Stream initialized, processing events...');
        for await (const event of stream) {
          console.log('Received event:', event);
          if (event.data?.output) {
            await writer.write(
              new TextEncoder().encode(
                JSON.stringify({ delta: event.data.output }) + '\n'
              )
            );
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        await writer.write(
          new TextEncoder().encode(
            JSON.stringify({ error: error.message }) + '\n'
          )
        );
      } finally {
        await writer.close();
      }
    }

    // Start processing the stream without awaiting
    processStream();

    return response;

  } catch (error) {
    console.error('Chat error:', error);
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
