
import { Button } from "@/components/ui/button";
import { Play, Check, X } from "lucide-react";
import type { QuizQuestion as QuizQuestionType } from "@/types/quiz";

interface QuizQuestionProps {
  question: QuizQuestionType;
  selectedAnswer: number | null;
  onAnswerSelect: (choiceIndex: number) => void;
  onSeek: (time: number) => void;
}

export const QuizQuestion = ({
  question,
  selectedAnswer,
  onAnswerSelect,
  onSeek
}: QuizQuestionProps) => {
  const isAnswerRevealed = selectedAnswer !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-lg break-words">{question.question}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSeek(question.timestamp)}
          className="whitespace-nowrap"
        >
          <Play className="w-4 h-4 mr-1" />
          {Math.floor(question.timestamp / 60)}:
          {Math.floor(question.timestamp % 60).toString().padStart(2, "0")}
        </Button>
      </div>

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
