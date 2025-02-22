
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wand2, Loader2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz, QuizQuestion } from "@/types/quiz";
import type { VideoDetails } from "@/types/video";

interface VideoQuizProps {
  video: VideoDetails;
  onSeek: (time: number) => void;
}

export const VideoQuiz = ({ video, onSeek }: VideoQuizProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const generateQuiz = async () => {
    if (!video.transcription_text) {
      toast({
        title: "Transcription Required",
        description: "Please generate a transcription first to create a quiz.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: quizData, error: generationError } = await supabase.functions
        .invoke("generate-quiz", {
          body: {
            videoId: video.id,
            title: video.title,
            transcription: video.transcription_text,
          },
        });

      if (generationError) throw generationError;

      // Ensure we have valid quiz data and validate its structure
      if (!quizData?.questions || !Array.isArray(quizData.questions)) {
        throw new Error("Invalid quiz data received from AI");
      }

      // Type guard to validate quiz data
      const isValidQuizQuestion = (q: any): q is QuizQuestion => {
        return (
          typeof q.timestamp === 'number' &&
          typeof q.question === 'string' &&
          Array.isArray(q.choices) &&
          q.choices.length === 4 &&
          typeof q.correctAnswer === 'number' &&
          q.correctAnswer >= 0 &&
          q.correctAnswer <= 3 &&
          typeof q.explanation === 'string'
        );
      };

      // Validate and transform questions
      const questions = quizData.questions.map((q: any): QuizQuestion => {
        if (!isValidQuizQuestion(q)) {
          throw new Error("Invalid question format received from AI");
        }
        return q as QuizQuestion;
      });

      const { data: savedQuiz, error: saveError } = await supabase
        .from("quizzes")
        .insert({
          video_id: video.id,
          questions: questions,
        })
        .select("*")
        .single();

      if (saveError) throw saveError;

      // Create a properly typed Quiz object
      const typedQuiz: Quiz = {
        id: savedQuiz.id,
        video_id: savedQuiz.video_id,
        questions: questions, // Use our validated questions array
        created_at: savedQuiz.created_at,
      };

      setQuiz(typedQuiz);
      toast({
        title: "Quiz Generated",
        description: "Your quiz is ready!",
      });
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers((current) => {
      const updated = new Set(current);
      if (updated.has(index)) {
        updated.delete(index);
      } else {
        updated.add(index);
      }
      return updated;
    });
  };

  const renderQuestion = (question: QuizQuestion, index: number) => {
    const isRevealed = revealedAnswers.has(index);

    return (
      <div key={index} className="space-y-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium">Question {index + 1}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSeek(question.timestamp)}
          >
            <Play className="w-4 h-4 mr-1" />
            {Math.floor(question.timestamp / 60)}:
            {Math.floor(question.timestamp % 60)
              .toString()
              .padStart(2, "0")}
          </Button>
        </div>
        
        <p>{question.question}</p>
        
        <div className="space-y-2">
          {question.choices.map((choice, choiceIndex) => (
            <div
              key={choiceIndex}
              className={`p-2 rounded ${
                isRevealed && choiceIndex === question.correctAnswer
                  ? "bg-green-100 dark:bg-green-900"
                  : "bg-background"
              }`}
            >
              {choice}
            </div>
          ))}
        </div>
        
        <Button
          variant="outline"
          onClick={() => toggleAnswer(index)}
        >
          {isRevealed ? "Hide Answer" : "Show Answer"}
        </Button>
        
        {isRevealed && (
          <div className="mt-2 text-sm text-muted-foreground">
            <p className="font-medium">Explanation:</p>
            <p>{question.explanation}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Quiz</h2>
          {!quiz && (
            <Button
              onClick={generateQuiz}
              disabled={isGenerating || !video.transcription_text}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          )}
        </div>

        {quiz && (
          <div className="space-y-4">
            {quiz.questions.map((question, index) => renderQuestion(question, index))}
          </div>
        )}

        {!quiz && !isGenerating && (
          <p className="text-center text-muted-foreground text-sm">
            Generate a quiz to test your knowledge of the video content
          </p>
        )}
      </div>
    </Card>
  );
};
