
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactPlayer from "react-player";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Eye, Calendar, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TranscriptionChunk {
  timestamp: [number, number];
  text: string;
}

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  views: number;
  duration: string;
  file_path: string;
  created_at: string;
  user_id: string;
  transcription_status?: string;
  transcription_text?: string;
  transcription_chunks?: TranscriptionChunk[];
}

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
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

        // Parse the transcription chunks if they exist
        const parsedVideo: VideoDetails = {
          ...videoData,
          transcription_chunks: videoData.transcription_chunks 
            ? (videoData.transcription_chunks as TranscriptionChunk[])
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
              ? (updatedVideo.transcription_chunks as TranscriptionChunk[])
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

  const renderTranscription = () => {
    if (!video) return null;

    if (video.transcription_status === 'completed' && video.transcription_chunks) {
      return (
        <div className="mt-4 space-y-2">
          <h3 className="font-semibold">Transcription</h3>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {video.transcription_chunks.map((chunk, index) => (
              <div 
                key={index}
                className="p-2 hover:bg-accent rounded-md cursor-pointer"
                onClick={() => {
                  const playerElement = document.querySelector('video');
                  if (playerElement) {
                    playerElement.currentTime = chunk.timestamp[0];
                    playerElement.play();
                  }
                }}
              >
                <div className="text-sm text-muted-foreground">
                  {Math.floor(chunk.timestamp[0] / 60)}:
                  {Math.floor(chunk.timestamp[0] % 60).toString().padStart(2, '0')} - 
                  {Math.floor(chunk.timestamp[1] / 60)}:
                  {Math.floor(chunk.timestamp[1] % 60).toString().padStart(2, '0')}
                </div>
                <div>{chunk.text}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (video.transcription_status === 'processing') {
      return (
        <div className="mt-4">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      );
    }

    return null;
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
          <div className="lg:col-span-8">
            <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6">
              <ReactPlayer
                url={videoUrl}
                width="100%"
                height="100%"
                controls
                playing
                playsinline
                config={{
                  file: {
                    attributes: {
                      crossOrigin: "anonymous",
                      controlsList: "nodownload",
                    },
                  },
                }}
              />
            </div>

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
                <h2 className="font-semibold mb-1">Description</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {video.description || "No description provided"}
                </p>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-2">AI Features</h2>
              <div className="space-y-4">
                <div>
                  <Button
                    onClick={startTranscription}
                    disabled={isTranscribing || video?.transcription_status === 'processing' || video?.transcription_status === 'completed'}
                    className="w-full"
                  >
                    <Wand2 className="w-4 h-4 mr-2" />
                    {video?.transcription_status === 'completed' 
                      ? 'Transcription Complete' 
                      : video?.transcription_status === 'processing' || isTranscribing
                      ? 'Transcribing...'
                      : 'Generate Transcription'}
                  </Button>
                  {renderTranscription()}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;
