
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fal } from "npm:@fal-ai/client";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId, title, transcription, transcription_chunks } = await req.json();

    if (!videoId || !title || !transcription_chunks) {
      throw new Error("Missing required parameters");
    }

    const apiKey = Deno.env.get("FAL_API_KEY");
    if (!apiKey) {
      throw new Error("FAL_API_KEY is not configured");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch existing quizzes for this video
    const { data: existingQuizzes, error: fetchError } = await supabase
      .from("quizzes")
      .select("questions")
      .eq("video_id", videoId);

    if (fetchError) {
      throw new Error(`Error fetching existing quizzes: ${fetchError.message}`);
    }

    // Extract existing questions
    const existingQuestions = existingQuizzes
      ?.flatMap(quiz => (quiz.questions as any[])?.map(q => q.question) || [])
      .filter(Boolean);

    // Format transcription chunks using seconds instead of min:sec
    const formattedChunks = transcription_chunks.map((chunk: any) => {
      const startTime = chunk.timestamp[0];
      const endTime = chunk.timestamp[1];
      return `[${startTime} - ${endTime} seconds] ${chunk.text}`;
    }).join("\n");

    // Get video duration range
    const minTimestamp = Math.min(...transcription_chunks.map((chunk: any) => chunk.timestamp[0]));
    const maxTimestamp = Math.max(...transcription_chunks.map((chunk: any) => chunk.timestamp[1]));

    fal.config({
      credentials: apiKey,
    });

    console.log("Generating quiz for video:", videoId);

    const prompt = `Generate a quiz based on this video content. Each chunk of text is provided with its exact timestamp range in seconds.
Title: ${title}

Content (with timestamps in seconds):
${formattedChunks}

Valid timestamp range: ${minTimestamp} to ${maxTimestamp} seconds.

${existingQuestions?.length ? `\nPreviously generated questions (DO NOT generate similar or identical questions):\n- ${existingQuestions.join("\n- ")}` : ''}

Please generate 5 UNIQUE and DIFFERENT multiple-choice questions in the following JSON format:
{
  "questions": [
    {
      "timestamp": <number representing seconds into the video where the answer can be found>,
      "question": "the question text",
      "choices": ["choice 1", "choice 2", "choice 3", "choice 4"],
      "correctAnswer": <index of correct answer (0-3)>,
      "explanation": "explanation of why this is the correct answer"
    }
  ]
}

Requirements:
1. Questions should be challenging but fair
2. IMPORTANT: Use timestamps within the valid range (${minTimestamp} to ${maxTimestamp} seconds)
3. Provide 4 choices for each question
4. Include clear explanations for the correct answers
5. Return valid JSON that exactly matches the format above
6. Do not include any text outside of the JSON structure
7. Generate completely different questions from the ones listed above`;

    console.log("Sending request to FAL AI...");

    const result = await fal.subscribe("fal-ai/any-llm", {
      input: {
        model: "anthropic/claude-3.5-sonnet",
        prompt,
      },
    });

    console.log("Received response from FAL AI:", result);

    if (!result?.data?.output) {
      throw new Error("No response received from AI");
    }

    let quizData;
    try {
      // Find the JSON object in the response
      const jsonMatch = result.data.output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      quizData = JSON.parse(jsonMatch[0]);
      console.log("Successfully parsed quiz data:", quizData);

      // Validate the structure of the parsed data
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error("Invalid quiz data structure");
      }

      // Validate each question
      quizData.questions.forEach((q: any, index: number) => {
        if (
          typeof q.timestamp !== 'number' ||
          typeof q.question !== 'string' ||
          !Array.isArray(q.choices) ||
          q.choices.length !== 4 ||
          typeof q.correctAnswer !== 'number' ||
          q.correctAnswer < 0 ||
          q.correctAnswer > 3 ||
          typeof q.explanation !== 'string'
        ) {
          throw new Error(`Invalid question format at index ${index}`);
        }

        // Verify timestamp is within the valid range
        if (q.timestamp < minTimestamp || q.timestamp > maxTimestamp) {
          throw new Error(`Question ${index + 1} timestamp (${q.timestamp}) is outside the valid range (${minTimestamp}-${maxTimestamp})`);
        }
      });

    } catch (error) {
      console.error("Failed to parse quiz data:", error, "Raw output:", result.data.output);
      throw new Error(`Failed to parse quiz data: ${error.message}`);
    }

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-quiz function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
