
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { VideoDetails } from "@/types/video";

interface VideoChatProps {
  video: VideoDetails;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const VideoChat = ({ video }: VideoChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !video.transcription_text) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-with-video", {
        body: {
          question: input,
          transcription: video.transcription_text,
        },
      });

      if (error) throw error;

      if (data?.output) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: data.output,
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error while processing your question. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-4">Chat about this video</h2>
      
      <div className="space-y-4">
        <div className="h-[300px] overflow-y-auto space-y-4 mb-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-left ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-4"
                  : "bg-muted mr-4"
              }`}
            >
              {message.content}
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm">
              Ask questions about the video content
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              video.transcription_status === 'processing'
                ? "Transcription in progress... Please wait."
                : !video.transcription_text
                ? "Video needs to be transcribed before you can chat about it"
                : "Ask a question about the video..."
            }
            className="min-h-[80px]"
            disabled={isLoading || !video.transcription_text}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !video.transcription_text}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : video.transcription_status === 'processing' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Transcribing Video...
              </>
            ) : !video.transcription_text ? (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                Transcription Required
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                Send Question
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};
