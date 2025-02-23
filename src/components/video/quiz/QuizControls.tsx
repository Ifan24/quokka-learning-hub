
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface QuizControlsProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  onPreviousQuestion: () => void;
  onNextQuestion: () => void;
}

export const QuizControls = ({
  currentQuestionIndex,
  totalQuestions,
  onPreviousQuestion,
  onNextQuestion,
}: QuizControlsProps) => {
  return (
    <div className="flex justify-between mt-4 h-9">
      <Button
        variant="outline"
        size="sm"
        onClick={onPreviousQuestion}
        disabled={currentQuestionIndex === 0}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onNextQuestion}
        disabled={currentQuestionIndex === totalQuestions - 1}
      >
        Next
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};
