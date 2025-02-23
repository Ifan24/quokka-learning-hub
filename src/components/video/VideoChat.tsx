
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { checkAndDeductCredits } from "@/utils/credits";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface ChatMessage {
  content: string;
  isUser: boolean;
}

export function VideoChat({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchInitialMessages = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("video_chats")
          .select("content, isUser")
          .eq("video_id", videoId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching initial messages:", error);
          toast({
            title: "Error",
            description: "Failed to load initial messages",
            variant: "destructive",
          });
        } else {
          setMessages(data as ChatMessage[]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialMessages();

    const channel = supabase
      .channel(`video_chat:${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "video_chats",
          filter: `video_id=eq.${videoId}`,
        },
        (payload) => {
          const newMessage = {
            content: payload.new.content,
            isUser: payload.new.isUser,
          };
          setMessages((prevMessages) => [...prevMessages, newMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [videoId, toast]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user) return;
    
    try {
      // Check and deduct credits before sending message
      await checkAndDeductCredits(user.id);
      
      setIsLoading(true);
      const { error } = await supabase.from("video_chats").insert({
        video_id: videoId,
        user_id: user.id,
        content: message,
        isUser: true,
      });

      if (error) {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      }

      setMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow space-y-4 p-4 overflow-y-auto">
        {isLoading && messages.length === 0 ? (
          <div>Loading messages...</div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg ${
                msg.isUser 
                  ? "bg-primary text-primary-foreground ml-auto" 
                  : "bg-muted"
              } max-w-[80%] ${msg.isUser ? "ml-auto" : "mr-auto"}`}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
          />
          <Button onClick={handleSendMessage} disabled={isLoading}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
