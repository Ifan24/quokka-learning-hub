
import { supabase } from "@/integrations/supabase/client";

export const checkAndDeductCredits = async (userId: string): Promise<boolean> => {
  try {
    // Get current credits
    const { data: creditData, error: creditError } = await supabase
      .from("credits")
      .select("amount")
      .eq("user_id", userId)
      .maybeSingle();

    if (creditError) throw creditError;
    
    if (!creditData || creditData.amount < 1) {
      throw new Error("Insufficient credits. Please redeem a code to continue.");
    }

    // Deduct 1 credit
    const { error: updateError } = await supabase.rpc('add_credits', {
      user_id_input: userId,
      amount_to_add: -1
    });

    if (updateError) throw updateError;

    return true;
  } catch (error: any) {
    console.error("Error checking/deducting credits:", error);
    throw error;
  }
};
