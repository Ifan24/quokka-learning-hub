
// @ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { fal } from 'npm:@fal-ai/client'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { videoId, transcriptionText } = await req.json()

    if (!videoId || !transcriptionText) {
      throw new Error('Missing required parameters')
    }

    // Initialize FAL client
    fal.config({
      credentials: Deno.env.get('FAL_API_KEY'),
    })

    const prompt = `You are a YouTube description writer. Based on this video transcript, write an engaging and informative video description that captures the main topics and key points discussed. Make it sound natural and engaging, similar to descriptions you'd find on popular YouTube videos. Focus only on the content - don't add any meta text like "Here's a description" or "This video is about". Write in a clear, direct style that will make viewers want to watch the video.

Transcript:
${transcriptionText}

Write a video description that captures the main points and value of this content.`

    console.log('Sending request to FAL AI for description generation...')
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

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Update video description in the database
    const { error: updateError } = await supabaseClient
      .from('videos')
      .update({ description: result.data.output })
      .eq('id', videoId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ success: true, description: result.data.output }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
        }
      }
    )

  } catch (error) {
    console.error('Description generation error:', error)
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
