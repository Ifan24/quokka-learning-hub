
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

    // Format transcription chunks for better context
    const formattedChunks = transcription_chunks.map((chunk: any) => {
      const startTime = chunk.timestamp[0];
      const endTime = chunk.timestamp[1];
      return `[${Math.floor(startTime/60)}:${Math.floor(startTime%60).toString().padStart(2, '0')} - ${Math.floor(endTime/60)}:${Math.floor(endTime%60).toString().padStart(2, '0')}] ${chunk.text}`;
    }).join("\n");

    fal.config({
      credentials: apiKey,
    });

    console.log("Generating quiz for video:", videoId);

    const prompt = `Generate a quiz based on this video content.
Title: ${title}

Content (with timestamps):
${formattedChunks}

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
2. IMPORTANT: Use the exact timestamps from the transcription chunks where the answer can be found. The timestamp should be the starting time (first number) from the relevant chunk.
3. Provide 4 choices for each question
4. Include clear explanations for the correct answers
5. Return valid JSON that exactly matches the format above
6. Do not include any text outside of the JSON structure
7. VERY IMPORTANT: Generate completely different questions from the ones listed above - do not repeat or rephrase existing questions`;

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

      // Validate each question and ensure timestamp exists in chunks
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

        // Verify that the timestamp exists in one of the chunks
        const timestampExists = transcription_chunks.some(
          (chunk: any) => 
            q.timestamp >= chunk.timestamp[0] && 
            q.timestamp <= chunk.timestamp[1]
        );

        if (!timestampExists) {
          throw new Error(`Question ${index + 1} has an invalid timestamp that doesn't match any transcription chunk`);
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
