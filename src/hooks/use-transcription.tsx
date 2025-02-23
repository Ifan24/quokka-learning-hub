
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { VideoDetails, TranscriptionChunk } from "@/types/video";

export const useTranscription = (video: VideoDetails | null, onTranscriptionComplete: (updatedVideo: VideoDetails) => void) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { toast } = useToast();

  const startTranscription = async () => {
    if (!video) return;

    try {
      setIsTranscribing(true);

      const { data: urlData, error: urlError } = await supabase.storage
        .from("videos")
        .createSignedUrl(video.file_path, 3600);

      if (urlError) throw urlError;
      if (!urlData?.signedUrl) throw new Error("Could not get video URL");

      const { error: transcriptionError } = await supabase.functions
        .invoke('transcribe-video', {
          body: { videoId: video.id, signedUrl: urlData.signedUrl }
        });

      if (transcriptionError) throw transcriptionError;

      toast({
        title: "Transcription started",
        description: "The video is being transcribed. This may take a few minutes.",
      });

      const interval = setInterval(async () => {
        const { data: updatedVideo, error: refreshError } = await supabase
          .from("videos")
          .select("*")
          .eq("id", video.id)
          .single();

        if (!refreshError && updatedVideo) {
          const parsedVideo: VideoDetails = {
            ...updatedVideo,
            transcription_chunks: updatedVideo.transcription_chunks 
              ? (updatedVideo.transcription_chunks as any as TranscriptionChunk[])
              : undefined
          };
          
          onTranscriptionComplete(parsedVideo);
          
          if (updatedVideo.transcription_status === 'completed') {
            clearInterval(interval);
            toast({
              title: "Transcription completed",
              description: "The video transcription is now available.",
            });
            setIsTranscribing(false);
          } else if (updatedVideo.transcription_status === 'failed') {
            clearInterval(interval);
            toast({
              title: "Transcription failed",
              description: "There was an error transcribing the video.",
              variant: "destructive",
            });
            setIsTranscribing(false);
          }
        }
      }, 5000);

      setTimeout(() => clearInterval(interval), 600000);

    } catch (error: any) {
      console.error("Transcription error:", error);
      toast({
        title: "Transcription failed",
        description: error.message,
        variant: "destructive",
      });
      setIsTranscribing(false);
    }
  };

  return { isTranscribing, startTranscription };
};
