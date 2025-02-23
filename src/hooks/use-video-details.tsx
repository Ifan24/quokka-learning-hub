
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { VideoDetails, TranscriptionChunk } from "@/types/video";

export const useVideoDetails = (id: string | undefined) => {
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data: videoData, error: videoError } = await supabase
          .from("videos")
          .select(`*`)
          .eq("id", id)
          .single();

        if (videoError) throw videoError;

        const parsedVideo: VideoDetails = {
          ...videoData,
          transcription_chunks: videoData.transcription_chunks 
            ? (videoData.transcription_chunks as any as TranscriptionChunk[])
            : undefined
        };
        
        setVideo(parsedVideo);

        const { data: urlData, error: urlError } = await supabase.storage
          .from("videos")
          .createSignedUrl(videoData.file_path, 7200);

        if (urlError) throw urlError;
        if (!urlData?.signedUrl) throw new Error("Could not get video URL");
        
        setVideoUrl(urlData.signedUrl);

        await supabase
          .from("videos")
          .update({ views: (videoData.views || 0) + 1 })
          .eq("id", id);

      } catch (error: any) {
        console.error("Error loading video:", error);
        toast({
          title: "Error loading video",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchVideo();
    }
  }, [id, toast]);

  return { video, loading, videoUrl, setVideo };
};
