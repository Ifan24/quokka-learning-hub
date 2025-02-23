
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { ConfirmEmail } from "@/components/auth/ConfirmEmail";
import { useAuth } from "@/components/AuthProvider";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we're on an email confirmation flow
    const token = searchParams.get("token");
    const type = searchParams.get("type");

    if (token && type) {
      toast({
        title: "Verifying your email...",
        description: "Please wait while we confirm your account.",
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const getTitle = () => {
    if (confirmedEmail) return "Confirm Your Email";
    if (isForgotPassword) return "Reset Password";
    if (isSignUp) return "Create an Account";
    return "Welcome Back";
  };

  const getForm = () => {
    if (confirmedEmail) {
      return <ConfirmEmail email={confirmedEmail} />;
    }
    if (isForgotPassword) {
      return (
        <ResetPasswordForm onBackToLogin={() => setIsForgotPassword(false)} />
      );
    }
    if (isSignUp) {
      return (
        <SignupForm
          onToggleMode={() => setIsSignUp(false)}
          onSignupSuccess={(email) => setConfirmedEmail(email)}
        />
      );
    }
    return (
      <LoginForm
        onToggleMode={() => setIsSignUp(true)}
        onForgotPassword={() => setIsForgotPassword(true)}
      />
    );
  };

  return <AuthCard title={getTitle()}>{getForm()}</AuthCard>;
};

export default Auth;
