
import { useRef, useEffect, useState } from "react";
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
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.seekTo(time);
    }
  };

  useEffect(() => {
    // Check if the widget script is loaded
    const checkWidget = () => {
      const widget = document.querySelector('elevenlabs-convai');
      if (widget) {
        setWidgetLoaded(true);
        if (video?.transcription_text) {
          const overrideConfig = {
            agent: {
              prompt: {
                prompt: `You are an AI assistant helping users understand a video. Here is the transcription of the video content: ${video.transcription_text}. Use this context to answer questions about the video content.`
              },
              first_message: "Hi! I've analyzed the video content and I'm ready to answer any questions you have about it. What would you like to know?"
            }
          };
          widget.setAttribute('override-config', JSON.stringify(overrideConfig));
        }
      } else {
        setWidgetError('Widget not loaded. Please refresh the page.');
      }
    };

    // Wait a bit for the script to load before checking
    const timeoutId = setTimeout(checkWidget, 2000);
    return () => clearTimeout(timeoutId);
  }, [video?.transcription_text]);

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

      {!widgetLoaded && (
        <div className="fixed bottom-4 right-4 bg-secondary p-4 rounded-lg shadow-lg">
          <div className="animate-spin h-5 w-5 mr-2 border-2 border-primary border-t-transparent rounded-full inline-block"></div>
          <span>Loading AI Chat widget...</span>
        </div>
      )}
      
      {widgetError && (
        <div className="fixed bottom-4 right-4 bg-destructive p-4 rounded-lg shadow-lg text-white">
          {widgetError}
        </div>
      )}

      <elevenlabs-convai
        agent-id="NFHyy3RjdfqvoaaVRqlC"
        action-text="Ask about this video"
        start-call-text="Start conversation"
        listening-text="Listening..."
        speaking-text="AI Assistant speaking"
      ></elevenlabs-convai>
    </div>
  );
};

export default Video;
