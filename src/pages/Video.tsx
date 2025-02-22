
import { useState } from "react";
import { useParams } from "react-router-dom";
import { VideoPlayer } from "@/components/video/VideoPlayer";
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <VideoPlayer
          url={video.file_path}
          playedSeconds={playedSeconds}
          onProgress={handleProgress}
        />
      </div>
    </div>
  );
};

export default Video;
