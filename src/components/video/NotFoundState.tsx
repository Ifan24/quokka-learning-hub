
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export const NotFoundState = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8 text-center">
        <p className="text-muted-foreground">Video not found</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
