
export interface UserCredits {
  user_id: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface RedeemCode {
  code: string;
  credit_amount: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
}
