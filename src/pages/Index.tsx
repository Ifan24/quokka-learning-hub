
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BrainCircuit, MessageCircle, FileText, Video, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import StatsCard from "@/components/StatsCard";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1 text-left space-y-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                Learn Smarter with{" "}
                <span className="text-[#FEC6A1]">AI-Powered Video Insights</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Quokka helps you learn efficiently with AI-generated quizzes,
                transcriptions, and interactive discussions.
              </p>
              <div className="flex gap-4">
                <Link to={user ? "/dashboard" : "/auth"}>
                  <Button size="lg" className="bg-[#FEC6A1] hover:bg-[#FDB68F] text-[#403E43] gap-2">
                    Get Started - Sign In
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1">
              <img
                src="/lovable-uploads/d94e341b-9b89-4d2d-89a3-d71e9b62c3e2.png"
                alt="Quokka learning illustration"
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-[#FDE1D3]/30">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#403E43]">Core Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
              <BrainCircuit className="w-12 h-12 text-[#FEC6A1] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-[#403E43]">AI Quiz Generator</h3>
              <p className="text-[#8A898C]">
                Generate multiple-choice questions with answers and timestamps.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
              <MessageCircle className="w-12 h-12 text-[#FEC6A1] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-[#403E43]">AI Chat Assistant</h3>
              <p className="text-[#8A898C]">
                Ask questions about video content and get instant AI-powered answers.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
              <FileText className="w-12 h-12 text-[#FEC6A1] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-[#403E43]">
                Transcriptions & Summaries
              </h3>
              <p className="text-[#8A898C]">
                Automatically generate video transcriptions for easy reference.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow bg-white/80 backdrop-blur-sm">
              <Video className="w-12 h-12 text-[#FEC6A1] mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-[#403E43]">
                Seamless Video Management
              </h3>
              <p className="text-[#8A898C]">
                Upload, organize, and publish videos effortlessly.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container px-4 mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
              icon={<Video className="w-6 h-6 text-[#FEC6A1]" />}
              title="Total Videos"
              value="1,000+"
              subtitle="Videos uploaded"
            />
            <StatsCard
              icon={<BrainCircuit className="w-6 h-6 text-[#FEC6A1]" />}
              title="AI Interactions"
              value="50,000+"
              subtitle="Questions answered"
            />
            <StatsCard
              icon={<FileText className="w-6 h-6 text-[#FEC6A1]" />}
              title="Learning Hours"
              value="10,000+"
              subtitle="Hours of content"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#FDE1D3]/30">
        <div className="container px-4 mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-[#403E43]">
            Start Your AI-Powered Learning Journey Today!
          </h2>
          <p className="text-xl text-[#8A898C] mb-8 max-w-2xl mx-auto">
            Join thousands of learners who are already experiencing the power of
            AI-enhanced video learning.
          </p>
          <Link to={user ? "/dashboard" : "/auth"}>
            <Button size="lg" className="bg-[#FEC6A1] hover:bg-[#FDB68F] text-[#403E43] gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Index;
