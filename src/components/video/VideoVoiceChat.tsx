
import { useCallback } from "react";
import { Card } from "@/components/ui/card";
import { useConversation } from "@11labs/react";
import { useToast } from "@/hooks/use-toast";
import type { VideoDetails } from "@/types/video";

interface VideoVoiceChatProps {
  video: VideoDetails;
}

export const VideoVoiceChat = ({ video }: VideoVoiceChatProps) => {
  const { toast } = useToast();
  
  // Initialize conversation with video context
  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to voice chat');
      toast({
        title: "Voice Chat Connected",
        description: "You can now start speaking with the AI assistant."
      });
    },
    onDisconnect: () => {
      console.log('Disconnected from voice chat');
      toast({
        title: "Voice Chat Disconnected",
        description: "The voice chat session has ended."
      });
    },
    onMessage: (message) => console.log('Message:', message),
    onError: (error) => {
      console.error('Voice chat error:', error);
      toast({
        title: "Voice Chat Error",
        description: error.message || "An error occurred with the voice chat.",
        variant: "destructive"
      });
    },
    overrides: video.transcription_text ? {
      agent: {
        prompt: {
          prompt: `You are an AI assistant helping users understand a video. Here is the transcription of the video content: ${video.transcription_text}. Use this context to answer questions about the video content.`
        },
        first_message: "Hi! I've analyzed the video content and I'm ready to answer any questions you have about it. What would you like to know?"
      }
    } : undefined
  });

  const startVoiceChat = useCallback(async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Start the conversation with your agent
      await conversation.startSession({
        agentId: "NFHyy3RjdfqvoaaVRqlC"
      });
    } catch (error: any) {
      console.error('Failed to start voice chat:', error);
      toast({
        title: "Failed to Start Voice Chat",
        description: error.message || "Please make sure you've granted microphone permissions.",
        variant: "destructive"
      });
    }
  }, [conversation, toast]);

  const stopVoiceChat = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-4">Voice Chat with AI</h2>
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={startVoiceChat}
            disabled={conversation.status === 'connected'}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            Start Voice Chat
          </button>
          <button
            onClick={stopVoiceChat}
            disabled={conversation.status !== 'connected'}
            className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-md disabled:opacity-50"
          >
            Stop Voice Chat
          </button>
        </div>

        <div className="text-sm text-muted-foreground space-y-2">
          <p>Status: {conversation.status}</p>
          <p>Agent is {conversation.isSpeaking ? 'speaking' : 'listening'}</p>
          {!video.transcription_text && (
            <p className="text-destructive">
              Note: Video needs to be transcribed first for context-aware responses.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};
