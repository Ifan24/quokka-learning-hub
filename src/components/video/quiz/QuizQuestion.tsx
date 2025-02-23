
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Check, X, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { QuizQuestion as QuizQuestionType } from "@/types/quiz";

interface QuizQuestionProps {
  question: QuizQuestionType;
  selectedAnswer: number | null;
  onAnswerSelect: (choiceIndex: number) => void;
  onSeek: (time: number) => void;
  currentQuestionIndex: number;
  totalQuestions: number;
}

// Cache for storing generated audio URLs
const audioCache = new Map<string, string>();

export const QuizQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  onSeek,
  currentQuestionIndex,
  totalQuestions
}: QuizQuestionProps) => {
  const isAnswerRevealed = selectedAnswer !== null;
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const generateAndPlaySpeech = async () => {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      
      // Stop any currently playing audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      // Check if we have cached audio for this question
      const cachedAudioUrl = audioCache.get(question.question);
      let audioUrl: string;

      if (cachedAudioUrl) {
        console.log('Using cached audio');
        audioUrl = cachedAudioUrl;
      } else {
        console.log('Generating new audio');
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { text: question.question }
        });

        if (error) {
          throw error;
        }

        if (!data?.audioContent) {
          console.error('Response data:', data);
          throw new Error('No audio content received from server');
        }

        audioUrl = `data:audio/mp3;base64,${data.audioContent}`;
        // Cache the audio URL
        audioCache.set(question.question, audioUrl);
      }

      // Create and play audio
      const audio = new Audio(audioUrl);
      
      audio.onerror = (e) => {
        console.error('Audio error:', e);
        setIsGenerating(false);
        toast({
          title: "Error",
          description: "Failed to play audio",
          variant: "destructive"
        });
      };

      audio.oncanplay = async () => {
        try {
          await audio.play();
        } catch (playError) {
          console.error('Play error:', playError);
          setIsGenerating(false);
          toast({
            title: "Error",
            description: "Failed to play audio",
            variant: "destructive"
          });
        }
      };
      
      audio.onended = () => {
        setIsGenerating(false);
      };
      
      setAudioElement(audio);
      
    } catch (error: any) {
      console.error('Speech generation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate speech",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={generateAndPlaySpeech}
            disabled={isGenerating}
            className="whitespace-nowrap"
          >
            {isGenerating ? (
              <div className="animate-spin h-4 w-4">◌</div>
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSeek(question.timestamp)}
            className="whitespace-nowrap"
          >
            <Play className="w-4 h-4 mr-1" />
            {Math.floor(question.timestamp / 60)}:
            {Math.floor(question.timestamp % 60).toString().padStart(2, '0')}
          </Button>
        </div>
      </div>

      <h3 className="font-medium text-lg text-left break-words">
        {question.question}
      </h3>

      <div className="grid grid-cols-1 gap-2">
        {question.choices.map((choice, idx) => (
          <Button
            key={idx}
            variant="outline"
            className={`justify-start h-auto py-3 px-4 text-left break-words ${
              isAnswerRevealed
                ? idx === question.correctAnswer
                  ? "bg-green-100 dark:bg-green-900 border-green-500"
                  : idx === selectedAnswer
                  ? "bg-red-100 dark:bg-red-900 border-red-500"
                  : ""
                : "hover:bg-accent"
            }`}
            onClick={() => onAnswerSelect(idx)}
            disabled={isAnswerRevealed}
          >
            <div className="flex items-start">
              {isAnswerRevealed && idx === question.correctAnswer && (
                <Check className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-green-500" />
              )}
              {isAnswerRevealed && idx === selectedAnswer && idx !== question.correctAnswer && (
                <X className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-red-500" />
              )}
              <span className="flex-1 text-base break-word">{choice}</span>
            </div>
          </Button>
        ))}
      </div>

      {isAnswerRevealed && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="font-medium">Explanation:</p>
          <p className="text-muted-foreground break-words">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};
