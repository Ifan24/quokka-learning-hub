import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { checkAndDeductCredits } from "@/utils/credits";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function VideoQuiz({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quiz, setQuiz] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateQuiz = async () => {
    if (!user) return;
    
    try {
      // Check and deduct credits before generating quiz
      await checkAndDeductCredits(user.id);
      
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("generate-quiz", {
        body: { video_id: videoId },
      });

      if (error) {
        throw error;
      }

      setQuiz(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quiz",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleGenerateQuiz} disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Quiz"
        )}
      </Button>

      {quiz && (
        <div>
          <h3 className="text-lg font-semibold">Quiz</h3>
          <ul>
            {quiz.questions.map((question: any, index: number) => (
              <li key={index} className="py-2">
                <p>
                  {index + 1}. {question.question}
                </p>
                <ul>
                  {question.options.map((option: string, optionIndex: number) => (
                    <li key={optionIndex}>
                      <label>
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                        />
                        {option}
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
