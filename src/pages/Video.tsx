
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import ReactPlayer from "react-player";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface VideoDetails {
  id: string;
  title: string;
  description: string;
  views: number;
  duration: string;
  file_path: string;
  created_at: string;
  user_id: string;
}

const Video = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data, error } = await supabase
          .from("videos")
          .select(`*`)
          .eq("id", id)
          .single();

        if (error) throw error;

        // Increment view count
        const { error: updateError } = await supabase
          .from("videos")
          .update({ views: (data.views || 0) + 1 })
          .eq("id", id);

        if (updateError) throw updateError;

        // Get signed URL for the full video without transformations
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("videos")
          .createSignedUrl(data.file_path, 3600);

        if (signedUrlError) throw signedUrlError;

        setVideo({ ...data, file_path: signedUrlData.signedUrl });

        // Load last watched position
        const lastPosition = localStorage.getItem(`video-progress-${id}`);
        if (lastPosition) {
          setPlayedSeconds(parseFloat(lastPosition));
        }
      } catch (error: any) {
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

  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    setPlayedSeconds(playedSeconds);
    localStorage.setItem(`video-progress-${id}`, playedSeconds.toString());
  };

  const handleBuffer = () => {
    setIsBuffering(true);
  };

  const handleBufferEnd = () => {
    setIsBuffering(false);
  };

  const handleError = (error: any) => {
    console.error("Video playback error:", error);
    // If the error is due to expired URL, refresh it
    if (error?.target?.error?.code === 2) { // MEDIA_ERR_NETWORK
      fetchNewSignedUrl();
    }
  };

  const fetchNewSignedUrl = async () => {
    if (!video) return;
    
    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from("videos")
        .createSignedUrl(video.file_path.split("/").pop()!, 3600);

      if (signedUrlError) throw signedUrlError;

      setVideo(prev => prev ? { ...prev, file_path: signedUrlData.signedUrl } : null);
    } catch (error: any) {
      toast({
        title: "Error refreshing video",
        description: "Please refresh the page to continue watching",
        variant: "destructive",
      });
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

  if (!video) {
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
          {/* Video Player and Details */}
          <div className="lg:col-span-8">
            <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6 relative">
              <ReactPlayer
                url={video.file_path}
                width="100%"
                height="100%"
                controls
                playing
                playsinline
                onProgress={handleProgress}
                onBuffer={handleBuffer}
                onBufferEnd={handleBufferEnd}
                onError={handleError}
                progressInterval={1000}
                config={{
                  file: {
                    attributes: {
                      controlsList: "nodownload",
                      preload: "auto",
                    },
                    forceVideo: true,
                    forceSafariHLS: true,
                    hlsOptions: {
                      maxLoadingDelay: 4,
                      minAutoBitrate: 0,
                      lowLatencyMode: true,
                      backBufferLength: 90,
                      maxBufferLength: 300,
                      maxMaxBufferLength: 600,
                      startLevel: -1,
                      manifestLoadingTimeOut: 10000,
                      manifestLoadingMaxRetry: 3,
                      levelLoadingTimeOut: 10000,
                      levelLoadingMaxRetry: 3,
                      fragLoadingTimeOut: 20000,
                      fragLoadingMaxRetry: 6,
                    },
                  },
                }}
                played={playedSeconds}
              />
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white">Loading...</div>
                </div>
              )}
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

          {/* Right Side - Reserved for AI Features */}
          <div className="lg:col-span-4">
            <Card className="p-4">
              <h2 className="font-semibold mb-2">AI Features</h2>
              <p className="text-sm text-muted-foreground">
                Coming soon: AI-powered chat and quiz features to enhance your learning experience.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Video;
