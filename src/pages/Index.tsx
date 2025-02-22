
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import StatsCard from "@/components/StatsCard";
import VideoCard from "@/components/VideoCard";
import { Clock, Film, Upload, User } from "lucide-react";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";

const mockVideos = [
  {
    title: "React 18 New Features Deep Dive",
    duration: "45:30",
    views: 1200,
    description: "Explore React 18 concurrent features and automatic batching functionality",
  },
  {
    title: "Machine Learning Fundamentals",
    duration: "1:20:00",
    views: 850,
    description: "Introduction to machine learning, covering supervised and unsupervised learning",
  },
  {
    title: "NextJS Data Fetching Strategies",
    duration: "55:45",
    views: 960,
    description: "Detailed explanation of NextJS SSR, SSG, and ISR data fetching methods",
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Learning Space</h1>
            <p className="text-muted-foreground mt-2">
              Manage your private video content and learning materials
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-4">
            <Input
              placeholder="Search in my videos..."
              className="max-w-sm"
            />
            <VideoUploadDialog />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={<Film className="w-5 h-5" />}
            title="My Videos"
            value="12"
            subtitle="Total uploaded videos"
          />
          <StatsCard
            icon={<Clock className="w-5 h-5" />}
            title="Learning Time"
            value="8.5 hours"
            subtitle="Total video content duration"
          />
          <StatsCard
            icon={<User className="w-5 h-5" />}
            title="Completed"
            value="75%"
            subtitle="Videos watched completion rate"
          />
          <StatsCard
            icon={<Upload className="w-5 h-5" />}
            title="Last Upload"
            value="2 days ago"
            subtitle="Latest content update"
          />
        </div>

        <h2 className="text-2xl font-semibold mb-4">My Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockVideos.map((video, index) => (
            <VideoCard key={index} {...video} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Index;
