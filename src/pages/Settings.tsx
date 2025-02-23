
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [credits, setCredits] = useState<number | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchCredits = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("credits")
          .select("amount")
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        setCredits(data.amount);
      } catch (error: any) {
        console.error("Error fetching credits:", error);
        toast({
          title: "Error",
          description: "Failed to load credits",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredits();
  }, [user, navigate, toast]);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim() || !user) return;

    setIsRedeeming(true);
    try {
      // First, check if the code exists and can be used
      const { data: codes, error: codeError } = await supabase
        .from("redeem_codes")
        .select("*")
        .eq("code", redeemCode)
        .single();

      if (codeError || !codes) {
        throw new Error("Invalid code");
      }

      if (codes.total_uses >= (codes.max_uses || 20)) {
        throw new Error("This code has reached its maximum usage limit");
      }

      // Check if user has already used this code
      const { data: usageData, error: usageError } = await supabase
        .from("code_usage")
        .select("*")
        .eq("code", redeemCode)
        .eq("user_id", user.id)
        .single();

      if (usageData) {
        throw new Error("You have already used this code");
      }

      // Update code usage and add credits in a transaction
      const { error: updateError } = await supabase.rpc('add_credits', {
        user_id_input: user.id,
        amount_to_add: codes.credit_amount
      });

      if (updateError) throw updateError;

      // Log the code usage
      const { error: logError } = await supabase
        .from("code_usage")
        .insert({
          user_id: user.id,
          code: redeemCode
        });

      if (logError) throw logError;

      // Update local credits state
      setCredits(prev => (prev || 0) + codes.credit_amount);
      
      // Clear input and show success message
      setRedeemCode("");
      toast({
        title: "Success!",
        description: `Successfully redeemed ${codes.credit_amount} credits!`,
      });
    } catch (error: any) {
      console.error("Error redeeming code:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to redeem code",
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                Credits
              </h2>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading credits...
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-4xl font-bold">{credits || 0}</p>
                  <p className="text-muted-foreground">
                    Credits are used for AI features like transcription, quiz generation, and chat.
                  </p>
                  
                  <form onSubmit={handleRedeemCode} className="space-y-4">
                    <div>
                      <label htmlFor="redeemCode" className="text-sm font-medium">
                        Redeem Code
                      </label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          id="redeemCode"
                          value={redeemCode}
                          onChange={(e) => setRedeemCode(e.target.value)}
                          placeholder="Enter your code"
                          className="flex-1"
                        />
                        <Button type="submit" disabled={isRedeeming}>
                          {isRedeeming ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Redeeming...
                            </>
                          ) : (
                            "Redeem"
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
