
import { useState } from "react";
import { Eye, Calendar, Wand2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { VideoDetails, TranscriptionChunk } from "@/types/video";

interface VideoInfoProps {
  video: VideoDetails;
  onUpdate: (updatedVideo: VideoDetails) => void;
}

export const VideoInfo = ({ video, onUpdate }: VideoInfoProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateDescription = async () => {
    if (!video.transcription_text) {
      toast({
        title: "Error",
        description: "Video transcription is required to generate description",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-description', {
        body: {
          videoId: video.id,
          transcriptionText: video.transcription_text
        }
      });

      if (error) throw error;

      // Fetch updated video details
      const { data: videoData, error: fetchError } = await supabase
        .from("videos")
        .select("*")
        .eq("id", video.id)
        .single();

      if (fetchError) throw fetchError;

      // Parse the transcription chunks before updating
      const parsedVideo: VideoDetails = {
        ...videoData,
        transcription_chunks: videoData.transcription_chunks 
          ? (videoData.transcription_chunks as any as TranscriptionChunk[])
          : undefined
      };

      onUpdate(parsedVideo);

      toast({
        title: "Success",
        description: "Description generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-2 text-left">{video.title}</h1>
      
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Description</h2>
            {(!video.description && video.transcription_status === 'completed') && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={generateDescription}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Description
                  </>
                )}
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap text-left">
            {video.description || "No description provided"}
          </p>
        </div>
      </Card>
    </>
  );
};
