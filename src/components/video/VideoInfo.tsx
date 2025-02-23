
import { Eye, Calendar, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { VideoDetails } from "@/types/video";

interface VideoInfoProps {
  video: VideoDetails;
}

export const VideoInfo = ({ video }: VideoInfoProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateDescription = async () => {
    if (!video.transcription_text) {
      toast({
        title: "Transcription Required",
        description: "The video needs to be transcribed before generating a description.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-description", {
        body: {
          videoId: video.id,
          transcriptionText: video.transcription_text,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Success",
          description: "Video description has been generated.",
        });
        // Update the video object with the new description
        video.description = data.description;
      }
    } catch (error) {
      console.error("Description generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate video description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-2">{video.title}</h1>
      
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center">
          <Eye className="w-4 h-4 mr-1" />
          {video.views?.toLocaleString() || 0} views
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          {format(new Date(video.created_at), "MMM d, yyyy")}
        </div>
        <div>Duration: {video.duration}</div>
      </div>

      <Card className="p-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold">Description</h2>
            {!video.description && video.transcription_text && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={generateDescription}
                disabled={isGenerating}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate with AI"}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {video.description || "No description provided"}
          </p>
        </div>
      </Card>
    </>
  );
};
