
import { useState, useRef } from "react";
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
  const streamingMessageRef = useRef<ChatMessage | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !video.transcription_text) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages(prev => [...prev, userMessage]);

    // Initialize streaming message
    streamingMessageRef.current = { role: "assistant", content: "" };
    setMessages(prev => [...prev, streamingMessageRef.current!]);

    setInput("");
    setIsLoading(true);

    try {
      console.log("Sending request to edge function...");
      const response = await fetch(`https://bclvquqynectsarfouvp.functions.supabase.co/chat-with-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjbHZxdXF5bmVjdHNhcmZvdXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMDY4MzgsImV4cCI6MjA1NTc4MjgzOH0.4QaBN2__cUbSCYteCQFJ4rgkIouhXck2Rp28Bz8lsZA`,
        },
        body: JSON.stringify({
          question: input,
          transcription: video.transcription_text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Server responded with ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        console.log("Received chunk:", chunk);

        try {
          const data = JSON.parse(chunk);
          if (data.error) {
            throw new Error(data.error);
          }
          if (data.delta) {
            streamingMessageRef.current!.content += data.delta;
            setMessages(prev => [...prev.slice(0, -1), { ...streamingMessageRef.current! }]);
          }
        } catch (parseError) {
          console.error("Error parsing chunk:", parseError);
          throw new Error("Failed to parse server response");
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev.slice(0, -1), {
        role: "assistant",
        content: `Error: ${error.message}`,
      }]);
    } finally {
      streamingMessageRef.current = null;
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
              className={`p-3 rounded-lg ${
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
            placeholder="Ask a question about the video..."
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
