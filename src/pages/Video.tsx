import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { VideoInfo } from "@/components/video/VideoInfo";
import { Transcription } from "@/components/video/Transcription";
import { AIFeatures } from "@/components/video/AIFeatures";
import type { VideoDetails, TranscriptionChunk } from "@/types/video";
import ReactPlayer from "react-player";

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const videoRef = useRef<ReactPlayer | null>(null);
  const { toast } = useToast();

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.seekTo(time);
    }
  };

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
          
          setVideo(parsedVideo);
          
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8">
          <Skeleton className="h-[60vh] w-full mb-4" />
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-1/4 mb-4" />
          <Skeleton className="h-20 w-3/4" />
        </div>
      </div>
    );
  }

  if (!video || !videoUrl) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Video not found</p>
          <Link to="/dashboard">
            <Button variant="outline" className="mt-4">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <div className="mb-6">
          <Link to="/dashboard">
            <Button variant="outline">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <VideoPlayer url={videoUrl} ref={videoRef} />
            <VideoInfo video={video} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Transcription
              video={video}
              isTranscribing={isTranscribing}
              onTranscribe={startTranscription}
            />
            <AIFeatures video={video} onSeek={handleSeek} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;
