
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoMetadata } from "@/components/video/VideoMetadata";
import { VideoDetailsCard } from "@/components/video/VideoDetailsCard";
import { VideoSkeleton } from "@/components/video/VideoSkeleton";
import { useVideoDetails } from "@/hooks/use-video-details";

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const { video, loading } = useVideoDetails(id);
  const [playedSeconds, setPlayedSeconds] = useState(0);

  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    setPlayedSeconds(playedSeconds);
    if (id) {
      localStorage.setItem(`video-progress-${id}`, playedSeconds.toString());
    }
  };

  if (loading) {
    return <VideoSkeleton />;
  }

  if (!video) {
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
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <div className="mb-6">
          <Link to="/dashboard">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <VideoPlayer
              url={video.file_path}
              playedSeconds={playedSeconds}
              onProgress={handleProgress}
            />

            <VideoMetadata
              title={video.title}
              views={video.views}
              createdAt={video.created_at}
              duration={video.duration}
            />

            <VideoDetailsCard
              userName={video.user?.full_name}
              description={video.description}
            />
          </div>

          <div className="lg:col-span-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-2">AI Features</h2>
              <p className="text-sm text-muted-foreground">
                Coming soon: AI-powered chat and quiz features to enhance your learning experience.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;
