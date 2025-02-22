
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VideoDetails {
  id: string;
  title: string;
  description: string | null;
  views: number | null;
  duration: string;
  file_path: string;
  created_at: string;
  user_id: string;
  user: {
    full_name: string | null;
  } | null;
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
          .select(`
            id,
            title,
            description,
            views,
            duration,
            file_path,
            created_at,
            user_id,
            profiles (
              full_name
            )
          `)
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!videoData) {
          toast({
            title: "Video not found",
            description: "The requested video could not be found.",
            variant: "destructive",
          });
          return;
        }

        // Increment view count
        const { error: updateError } = await supabase
          .from("videos")
          .update({ views: (videoData.views || 0) + 1 })
          .eq("id", id);

        if (updateError) throw updateError;

        // Get video URL
        const { data: { publicUrl } } = supabase.storage
          .from("videos")
          .getPublicUrl(videoData.file_path);

        setVideo({
          ...videoData,
          file_path: publicUrl,
          user: {
            full_name: videoData.profiles?.full_name || null
          }
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
