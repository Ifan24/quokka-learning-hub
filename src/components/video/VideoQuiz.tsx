import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestion } from "./quiz/QuizQuestion";
import { QuizNavigation } from "./quiz/QuizNavigation";
import { QuizControls } from "./quiz/QuizControls";
import type { Quiz, QuizQuestion as QuizQuestionType } from "@/types/quiz";
import type { VideoDetails } from "@/types/video";
import type { Json } from "@/integrations/supabase/types";

interface VideoQuizProps {
  video: VideoDetails;
  onSeek: (time: number) => void;
}

const validateQuizQuestion = (q: Json): boolean => {
  if (!q || typeof q !== 'object') return false;
  return typeof (q as any).timestamp === 'number' && 
         typeof (q as any).question === 'string' && 
         Array.isArray((q as any).choices) && 
         (q as any).choices.length === 4 && 
         typeof (q as any).correctAnswer === 'number' && 
         typeof (q as any).explanation === 'string';
};

const convertToQuizQuestion = (q: Json): QuizQuestionType => {
  return {
    timestamp: (q as any).timestamp,
    question: (q as any).question,
    choices: (q as any).choices,
    correctAnswer: (q as any).correctAnswer,
    explanation: (q as any).explanation
  };
};

export const VideoQuiz = ({ video, onSeek }: VideoQuizProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadQuizzes();
  }, [video.id]);

  const loadQuizzes = async () => {
    try {
      setQuizzes([]);
      
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
      console.log("Loaded quizzes:", validQuizzes);
      setQuizzes(validQuizzes);
      setCurrentQuizIndex(0);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
    } catch (error: any) {
      console.error("Error loading quizzes:", error);
      toast({
        title: "Error Loading Quizzes",
        description: error.message,
        variant: "destructive"
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
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    try {
      const {
        data: quizData,
        error: generationError
      } = await supabase.functions.invoke("generate-quiz", {
        body: {
          videoId: video.id,
          title: video.title,
          transcription: video.transcription_text,
          transcription_chunks: video.transcription_chunks
        }
      });
      if (generationError) throw generationError;
      if (!quizData?.questions || !Array.isArray(quizData.questions)) {
        throw new Error("Invalid quiz data received from AI");
      }
      const {
        data: savedQuiz,
        error: saveError
      } = await supabase.from("quizzes").insert({
        video_id: video.id,
        questions: quizData.questions
      }).select("*").single();
      if (saveError) throw saveError;
      const newQuiz: Quiz = {
        id: savedQuiz.id,
        video_id: savedQuiz.video_id,
        questions: quizData.questions,
        created_at: savedQuiz.created_at
      };
      setQuizzes(prev => [newQuiz, ...prev]);
      setCurrentQuizIndex(0);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      toast({
        title: "Quiz Generated",
        description: "Your quiz is ready!"
      });
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
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
    if (!quizzes.length || isDeleting) return;
    
    const quizToDelete = quizzes[currentQuizIndex];
    console.log("Attempting to delete quiz:", quizToDelete);
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizToDelete.id);
      
      if (error) throw error;

      console.log("Quiz deleted successfully");
      
      const updatedQuizzes = quizzes.filter(quiz => quiz.id !== quizToDelete.id);
      setQuizzes(updatedQuizzes);
      
      if (currentQuizIndex >= updatedQuizzes.length) {
        setCurrentQuizIndex(Math.max(0, updatedQuizzes.length - 1));
      }
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      
      toast({
        title: "Quiz Deleted",
        description: "The quiz has been successfully deleted."
      });
    } catch (error: any) {
      console.error("Error deleting quiz:", error);
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
      await loadQuizzes();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Quiz</h2>
          <Button
            onClick={generateQuiz}
            disabled={isGenerating || !video.transcription_text}
            title={
              video.transcription_status === 'processing'
                ? "Please wait while the video is being transcribed"
                : !video.transcription_text
                ? "Video needs to be transcribed before generating a quiz"
                : "Generate a new quiz"
            }
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : video.transcription_status === 'processing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transcribing...
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
          <>
            <QuizNavigation
              quizzes={quizzes}
              currentQuizIndex={currentQuizIndex}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={quizzes[currentQuizIndex].questions.length}
              isDeleting={isDeleting}
              onPreviousQuiz={previousQuiz}
              onNextQuiz={nextQuiz}
              onDeleteQuiz={deleteQuiz}
            />
            <QuizQuestion
              question={quizzes[currentQuizIndex].questions[currentQuestionIndex]}
              selectedAnswer={selectedAnswer}
              onAnswerSelect={handleAnswerSelect}
              onSeek={onSeek}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={quizzes[currentQuizIndex].questions.length}
            />
            <QuizControls
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={quizzes[currentQuizIndex].questions.length}
              onPreviousQuestion={previousQuestion}
              onNextQuestion={nextQuestion}
            />
          </>
        ) : (
          <p className="text-center text-muted-foreground text-sm">
            {video.transcription_status === 'processing'
              ? "Video is being transcribed. Quiz generation will be available soon."
              : !video.transcription_text
              ? "Video needs to be transcribed before generating a quiz. Use the transcribe button above."
              : "Generate a quiz to test your knowledge of the video content"}
          </p>
        )}
      </div>
    </Card>
  );
};
