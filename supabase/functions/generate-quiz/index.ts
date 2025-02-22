
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { fal } from "npm:@fal-ai/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoId, title, transcription } = await req.json();

    if (!videoId || !title || !transcription) {
      throw new Error("Missing required parameters");
    }

    const apiKey = Deno.env.get("FAL_API_KEY");
    if (!apiKey) {
      throw new Error("FAL_API_KEY is not configured");
    }

    fal.config({
      credentials: apiKey,
    });

    console.log("Generating quiz for video:", videoId);

    const prompt = `Generate a quiz based on this video content.
Title: ${title}

Content:
${transcription}

Please generate 5 multiple-choice questions in the following JSON format:
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
2. All timestamps should correspond to relevant moments in the video
3. Provide 4 choices for each question
4. Include clear explanations for the correct answers
5. Return valid JSON that exactly matches the format above
6. Do not include any text outside of the JSON structure`;

    console.log("Sending request to FAL AI...");

    const result = await fal.subscribe("fal-ai/any-llm", {
      input: {
        model: "anthropic/claude-3.5-sonnet",
        prompt,
      },
    });

    console.log("Received response from FAL AI:", result);

    if (!result || !result.output) {
      throw new Error("No response received from AI");
    }

    let quizData;
    try {
      // Find the JSON object in the response
      const jsonMatch = result.output.match(/\{[\s\S]*\}/);
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
      });

    } catch (error) {
      console.error("Failed to parse quiz data:", error, "Raw output:", result.output);
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
