
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VideoDetails {
  id: string;
  title: string;
  file_path: string;
}

export const useVideoDetails = (id: string | undefined) => {
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;

      try {
        const { data: videoData, error } = await supabase
          .from("videos")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        if (!videoData) {
          toast({
            title: "Video not found",
            description: "The requested video could not be found.",
            variant: "destructive",
          });
          return;
        }

        // Get video URL - this should return the full public URL for the video file
        const { data } = supabase.storage
          .from("videos")
          .getPublicUrl(videoData.file_path);

        console.log("Video URL:", data.publicUrl); // Debug log

        setVideo({
          id: videoData.id,
          title: videoData.title,
          file_path: data.publicUrl
        });
      } catch (error: any) {
        console.error("Video loading error:", error);
        toast({
          title: "Error loading video",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id, toast]);

  return { video, loading };
};
