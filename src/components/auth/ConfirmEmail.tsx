
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

export const ConfirmEmail = ({ email }: { email: string }) => {
  const navigate = useNavigate();

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <Mail className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-muted-foreground">
          We sent a confirmation link to:
          <br />
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Click the link in the email to confirm your account.
          <br />
          If you don't see it, check your spam folder.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/auth")}
        >
          Back to Sign In
        </Button>
      </div>
    </div>
  );
};
