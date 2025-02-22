import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wand2, Loader2, Play, ArrowLeft, ArrowRight, Check, X, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Quiz, QuizQuestion } from "@/types/quiz";
import type { VideoDetails } from "@/types/video";
import type { Json } from "@/integrations/supabase/types";

interface VideoQuizProps {
  video: VideoDetails;
  onSeek: (time: number) => void;
}

const validateQuizQuestion = (q: Json): boolean => {
  if (!q || typeof q !== 'object') return false;
  return (
    typeof (q as any).timestamp === 'number' &&
    typeof (q as any).question === 'string' &&
    Array.isArray((q as any).choices) &&
    (q as any).choices.length === 4 &&
    typeof (q as any).correctAnswer === 'number' &&
    typeof (q as any).explanation === 'string'
  );
};

const convertToQuizQuestion = (q: Json): QuizQuestion => {
  return {
    timestamp: (q as any).timestamp,
    question: (q as any).question,
    choices: (q as any).choices,
    correctAnswer: (q as any).correctAnswer,
    explanation: (q as any).explanation,
  };
};

export const VideoQuiz = ({ video, onSeek }: VideoQuizProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadQuizzes();
  }, [video.id]);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("video_id", video.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const validQuizzes: Quiz[] = [];
      
      for (const rawQuiz of data || []) {
        if (Array.isArray(rawQuiz.questions) && rawQuiz.questions.every(validateQuizQuestion)) {
          validQuizzes.push({
            id: rawQuiz.id,
            video_id: rawQuiz.video_id,
            questions: rawQuiz.questions.map(convertToQuizQuestion),
            created_at: rawQuiz.created_at
          });
        } else {
          console.warn("Invalid quiz data found:", rawQuiz);
        }
      }

      setQuizzes(validQuizzes);
    } catch (error: any) {
      console.error("Error loading quizzes:", error);
      toast({
        title: "Error Loading Quizzes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!video.transcription_chunks) {
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
            transcription_chunks: video.transcription_chunks,
          },
        });

      if (generationError) throw generationError;

      if (!quizData?.questions || !Array.isArray(quizData.questions)) {
        throw new Error("Invalid quiz data received from AI");
      }

      const { data: savedQuiz, error: saveError } = await supabase
        .from("quizzes")
        .insert({
          video_id: video.id,
          questions: quizData.questions,
        })
        .select("*")
        .single();

      if (saveError) throw saveError;

      const newQuiz: Quiz = {
        id: savedQuiz.id,
        video_id: savedQuiz.video_id,
        questions: quizData.questions,
        created_at: savedQuiz.created_at,
      };

      setQuizzes((prev) => [newQuiz, ...prev]);
      setCurrentQuizIndex(0);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);

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

  const handleAnswerSelect = (choiceIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(choiceIndex);
  };

  const nextQuestion = () => {
    const currentQuiz = quizzes[currentQuizIndex];
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
    setSelectedAnswer(null);
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
    setSelectedAnswer(null);
  };

  const nextQuiz = () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
    }
  };

  const previousQuiz = () => {
    if (currentQuizIndex > 0) {
      setCurrentQuizIndex(prev => prev - 1);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
    }
  };

  const deleteQuiz = async () => {
    if (!quizzes.length) return;
    
    const quizToDelete = quizzes[currentQuizIndex];
    
    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizToDelete.id);

      if (error) throw error;

      setQuizzes((prev) => prev.filter(quiz => quiz.id !== quizToDelete.id));
      
      if (currentQuizIndex >= quizzes.length - 1) {
        setCurrentQuizIndex(Math.max(0, quizzes.length - 2));
      }
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);

      toast({
        title: "Quiz Deleted",
        description: "The quiz has been successfully deleted.",
      });
    } catch (error: any) {
      console.error("Error deleting quiz:", error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const renderCurrentQuestion = () => {
    if (quizzes.length === 0) return null;

    const currentQuiz = quizzes[currentQuizIndex];
    const question = currentQuiz.questions[currentQuestionIndex];
    const totalQuestions = currentQuiz.questions.length;
    const isAnswerRevealed = selectedAnswer !== null;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousQuiz}
                disabled={currentQuizIndex === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <div className="text-sm text-muted-foreground">
                Quiz {quizzes.length - currentQuizIndex} of {quizzes.length}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={nextQuiz}
                disabled={currentQuizIndex === quizzes.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={deleteQuiz}
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSeek(question.timestamp)}
          >
            <Play className="w-4 h-4 mr-1" />
            {Math.floor(question.timestamp / 60)}:
            {Math.floor(question.timestamp % 60).toString().padStart(2, "0")}
          </Button>
        </div>

        <h3 className="font-medium text-lg">{question.question}</h3>

        <div className="grid grid-cols-1 gap-2">
          {question.choices.map((choice, idx) => (
            <Button
              key={idx}
              variant="outline"
              className={`justify-start h-auto py-3 px-4 ${
                isAnswerRevealed
                  ? idx === question.correctAnswer
                    ? "bg-green-100 dark:bg-green-900 border-green-500"
                    : idx === selectedAnswer
                    ? "bg-red-100 dark:bg-red-900 border-red-500"
                    : ""
                  : "hover:bg-accent"
              }`}
              onClick={() => handleAnswerSelect(idx)}
              disabled={isAnswerRevealed}
            >
              {isAnswerRevealed && idx === question.correctAnswer && (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              )}
              {isAnswerRevealed && idx === selectedAnswer && idx !== question.correctAnswer && (
                <X className="w-4 h-4 mr-2 text-red-500" />
              )}
              {choice}
            </Button>
          ))}
        </div>

        {isAnswerRevealed && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">Explanation:</p>
            <p className="text-muted-foreground">{question.explanation}</p>
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
          <Button
            onClick={generateQuiz}
            disabled={isGenerating || !video.transcription_chunks}
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
        </div>

        {isLoading ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading quizzes...</p>
          </div>
        ) : quizzes.length > 0 ? (
          renderCurrentQuestion()
        ) : (
          <p className="text-center text-muted-foreground text-sm">
            Generate a quiz to test your knowledge of the video content
          </p>
        )}
      </div>

      {quizzes.length > 0 && (
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={nextQuestion}
            disabled={currentQuestionIndex === quizzes[currentQuizIndex].questions.length - 1}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </Card>
  );
};
