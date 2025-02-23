
import { Button } from "@/components/ui/button";
import { 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Loader2 
} from "lucide-react";
import type { Quiz } from "@/types/quiz";

interface QuizNavigationProps {
  quizzes: Quiz[];
  currentQuizIndex: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  isDeleting: boolean;
  onPreviousQuiz: () => void;
  onNextQuiz: () => void;
  onDeleteQuiz: () => void;
}

export const QuizNavigation = ({
  quizzes,
  currentQuizIndex,
  currentQuestionIndex,
  totalQuestions,
  isDeleting,
  onPreviousQuiz,
  onNextQuiz,
  onDeleteQuiz,
}: QuizNavigationProps) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onPreviousQuiz}
            disabled={currentQuizIndex === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            Quiz {quizzes.length - currentQuizIndex} of {quizzes.length}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextQuiz}
            disabled={currentQuizIndex === quizzes.length - 1}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDeleteQuiz}
            disabled={isDeleting}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </div>
      </div>
    </div>
  );
};
