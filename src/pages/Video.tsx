
import { useRef, useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoInfo } from "@/components/video/VideoInfo";
import { Transcription } from "@/components/video/Transcription";
import { AIFeatures } from "@/components/video/AIFeatures";
import { LoadingState } from "@/components/video/LoadingState";
import { NotFoundState } from "@/components/video/NotFoundState";
import { useVideoDetails } from "@/hooks/use-video-details";
import { useTranscription } from "@/hooks/use-transcription";
import { useConversation } from "@11labs/react";
import ReactPlayer from "react-player";

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const { video, loading, videoUrl, setVideo } = useVideoDetails(id);
  const { isTranscribing, startTranscription } = useTranscription(video, setVideo);
  const videoRef = useRef<ReactPlayer | null>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const checkAttemptsRef = useRef(0);

  // Initialize conversation
  const conversation = useConversation({
    onConnect: () => console.log('Connected to voice chat'),
    onDisconnect: () => console.log('Disconnected from voice chat'),
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => console.error('Voice chat error:', error),
  });

  const startVoiceChat = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start the conversation with your agent
      await conversation.startSession({
        agentId: "NFHyy3RjdfqvoaaVRqlC", // Using the same agent ID as the widget
      });
    } catch (error) {
      console.error('Failed to start voice chat:', error);
    }
  }, [conversation]);

  const stopVoiceChat = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.seekTo(time);
    }
  };

  useEffect(() => {
    // Check if the widget script is loaded
    const checkWidget = () => {
      const widget = document.querySelector('elevenlabs-convai');
      console.log('Checking for widget...', widget ? 'found' : 'not found', 'attempt:', checkAttemptsRef.current);
      
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
        checkAttemptsRef.current += 1;
        if (checkAttemptsRef.current >= 30) { // Try for 30 seconds (30 attempts * 1000ms)
          setWidgetError('Widget failed to load. Try voice chat instead.');
          return;
        }
        // Continue checking every second until widget is found or max attempts reached
        setTimeout(checkWidget, 1000);
      }
    };

    // Start checking for widget
    checkWidget();

    // Cleanup function
    return () => {
      checkAttemptsRef.current = 30; // Stop any ongoing checks
    };
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
            
            {/* Voice Chat Controls */}
            <div className="p-4 bg-card rounded-lg shadow-sm">
              <h3 className="font-semibold mb-4">Voice Chat</h3>
              <div className="flex gap-4">
                <button
                  onClick={startVoiceChat}
                  disabled={conversation.status === 'connected'}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                >
                  Start Voice Chat
                </button>
                <button
                  onClick={stopVoiceChat}
                  disabled={conversation.status !== 'connected'}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md disabled:opacity-50"
                >
                  Stop Voice Chat
                </button>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>Status: {conversation.status}</p>
                <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!widgetLoaded && !widgetError && (
        <div className="fixed bottom-4 right-4 bg-secondary p-4 rounded-lg shadow-lg">
          <div className="animate-spin h-5 w-5 mr-2 border-2 border-primary border-t-transparent rounded-full inline-block"></div>
          <span>Loading AI Chat widget... {checkAttemptsRef.current}/30</span>
        </div>
      )}
      
      {widgetError && (
        <div className="fixed bottom-4 right-4 bg-secondary p-4 rounded-lg shadow-lg">
          <span>{widgetError}</span>
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
