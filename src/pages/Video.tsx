
import { useRef } from "react";
import { useParams } from "react-router-dom";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoInfo } from "@/components/video/VideoInfo";
import { Transcription } from "@/components/video/Transcription";
import { AIFeatures } from "@/components/video/AIFeatures";
import { LoadingState } from "@/components/video/LoadingState";
import { NotFoundState } from "@/components/video/NotFoundState";
import { useVideoDetails } from "@/hooks/use-video-details";
import { useTranscription } from "@/hooks/use-transcription";
import ReactPlayer from "react-player";

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const { video, loading, videoUrl, setVideo } = useVideoDetails(id);
  const { isTranscribing, startTranscription } = useTranscription(video, setVideo);
  const videoRef = useRef<ReactPlayer | null>(null);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.seekTo(time);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!video || !videoUrl) {
    return <NotFoundState />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <VideoPlayer url={videoUrl} ref={videoRef} />
            <VideoInfo video={video} onUpdate={setVideo} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Transcription
              video={video}
              isTranscribing={isTranscribing}
              onTranscribe={startTranscription}
            />
            <AIFeatures video={video} onSeek={handleSeek} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;
