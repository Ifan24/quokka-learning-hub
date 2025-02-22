
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { PricingButton } from "@/components/PricingButton";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-16 space-y-16">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Your Personal Learning Hub
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your video content into an interactive learning experience with AI-powered quizzes and insights.
          </p>
        </div>

        <Card className="max-w-2xl mx-auto p-8">
          <div className="text-center mb-8">
            <div className="text-lg font-medium mb-2">Pro Plan</div>
            <div className="text-4xl font-bold">$9.99<span className="text-lg font-normal text-muted-foreground">/month</span></div>
          </div>

          <div className="space-y-4 mb-8">
            {[
              "Unlimited video uploads",
              "AI-generated quizzes",
              "Video transcriptions",
              "Smart video search",
              "Interactive learning tools",
              "Progress tracking",
            ].map((feature) => (
              <div key={feature} className="flex items-start">
                <Check className="h-5 w-5 text-primary shrink-0 mr-2" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <PricingButton />
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Landing;
