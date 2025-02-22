
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import type { UserCredits } from "@/types/credits";

const Settings = () => {
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setCredits(data);
    } catch (error: any) {
      toast({
        title: "Error fetching credits",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRedeem = async () => {
    if (!user || !redeemCode.trim()) return;

    setIsRedeeming(true);
    try {
      // Attempt to redeem the code
      const { data: code, error: codeError } = await supabase
        .from("redeem_codes")
        .select("*")
        .eq("code", redeemCode.trim())
        .single();

      if (codeError || !code) throw new Error("Invalid code");
      if (code.is_used) throw new Error("Code has already been used");

      // Update the redeem code status
      const { error: updateError } = await supabase
        .from("redeem_codes")
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("code", redeemCode);

      if (updateError) throw updateError;

      // Add credits to user's balance using direct update
      const { error: creditError } = await supabase
        .from("credits")
        .update({ 
          amount: (credits?.amount || 0) + code.credit_amount 
        })
        .eq("user_id", user.id);

      if (creditError) throw creditError;

      toast({
        title: "Success!",
        description: `Added ${code.credit_amount} credits to your account.`,
      });

      setRedeemCode("");
      fetchCredits();
    } catch (error: any) {
      toast({
        title: "Error redeeming code",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="grid gap-6 max-w-2xl">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Credits</h2>
            <div className="mb-6">
              <p className="text-muted-foreground">
                You currently have{" "}
                <span className="text-foreground font-semibold">
                  {credits?.amount ?? 0}
                </span>{" "}
                credits
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Credits are used for AI features like transcription, chat, and quiz generation.
                Each feature costs 1 credit.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="redeemCode">Redeem Code</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="redeemCode"
                    placeholder="Enter your code"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                  />
                  <Button
                    onClick={handleRedeem}
                    disabled={isRedeeming || !redeemCode.trim()}
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Redeeming...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4 mr-2" />
                        Redeem
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default Settings;
