
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LoginFormProps {
  onToggleMode: () => void;
  onForgotPassword: () => void;
}

export const LoginForm = ({ onToggleMode, onForgotPassword }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-[#403E43]">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-[#403E43]">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full bg-[#FEC6A1] hover:bg-[#FDB68F] text-[#403E43]" disabled={isLoading}>
        {isLoading ? "Loading..." : "Sign In"}
      </Button>
      
      <p className="text-center text-sm text-[#8A898C]">
        Need an account?{" "}
        <button
          type="button"
          onClick={onToggleMode}
          className="text-[#FEC6A1] hover:underline"
        >
          Sign Up
        </button>
      </p>
      
      <p className="text-center text-sm text-[#8A898C]">
        Forgot your password?{" "}
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-[#FEC6A1] hover:underline"
        >
          Reset it here
        </button>
      </p>
    </form>
  );
};
