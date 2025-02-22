
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import ReactPlayer from "react-player";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const playerRef = useRef<ReactPlayer>(null);
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const { data, error } = await supabase
          .from("videos")
          .select(`*`)
          .eq("id", id)
          .single();

        if (error) throw error;

        const { error: updateError } = await supabase
          .from("videos")
          .update({ views: (data.views || 0) + 1 })
          .eq("id", id);

        if (updateError) throw updateError;

        setVideo(data);
        await refreshVideoUrl(data.file_path);

        const lastPosition = localStorage.getItem(`video-progress-${id}`);
        if (lastPosition) {
          setPlayedSeconds(parseFloat(lastPosition));
        }
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

  const refreshVideoUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("videos")
        .createSignedUrl(filePath, 7200); // 2 hours

      if (error) throw error;
      if (!data?.signedUrl) throw new Error("Could not get video URL");

      setVideoUrl(data.signedUrl);
      setLoadingProgress(0);
    } catch (error: any) {
      console.error("Error refreshing video URL:", error);
      toast({
        title: "Error refreshing video",
        description: "Please refresh the page to continue watching",
        variant: "destructive",
      });
    }
  };

  const handleProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    if (canPlay) {
      setPlayedSeconds(playedSeconds);
      localStorage.setItem(`video-progress-${id}`, playedSeconds.toString());
    }
  };

  const handleBuffer = () => {
    console.log("Video buffering...");
    setIsBuffering(true);
  };

  const handleBufferEnd = () => {
    console.log("Video buffering ended");
    setIsBuffering(false);
  };

  const handleError = async (error: any) => {
    console.error("Video playback error:", error);
    if (video) {
      setCanPlay(false);
      setIsVideoLoading(true);
      setLoadingProgress(0);
      await refreshVideoUrl(video.file_path);
    }
  };

  const handleReady = () => {
    console.log("Video ready to play");
    if (playerRef.current) {
      const videoElement = playerRef.current.getInternalPlayer();
      if (videoElement) {
        videoElement.setAttribute('preload', 'auto');

        // Track loading progress
        let lastLoadedPercent = 0;
        const updateLoadingProgress = () => {
          if (videoElement.buffered.length > 0) {
            const loadedFraction = videoElement.buffered.end(0) / videoElement.duration;
            const loadedPercent = Math.round(loadedFraction * 100);
            if (loadedPercent !== lastLoadedPercent) {
              console.log(`Loading progress: ${loadedPercent}%`);
              setLoadingProgress(loadedPercent);
              lastLoadedPercent = loadedPercent;
            }
            
            // Consider video ready to play when it's mostly loaded
            if (loadedPercent >= 95) {
              setIsVideoLoading(false);
              setCanPlay(true);
            }
          }
        };

        videoElement.addEventListener('progress', updateLoadingProgress);
        videoElement.addEventListener('loadeddata', () => {
          console.log("Initial video data loaded");
          updateLoadingProgress();
        });

        videoElement.addEventListener('canplaythrough', () => {
          console.log("Video can play through");
          updateLoadingProgress();
        });

        // Start loading the video
        videoElement.load();
      }
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
          <div className="lg:col-span-8">
            <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6 relative">
              {isVideoLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                  <div className="text-white text-center mb-4">
                    <div className="mb-2 text-lg font-medium">Loading video...</div>
                    <div className="text-sm text-gray-300">{loadingProgress}% loaded</div>
                  </div>
                  <div className="w-64">
                    <Progress value={loadingProgress} className="h-2" />
                  </div>
                </div>
              ) : (
                <div className={`transition-opacity duration-300 ${canPlay ? 'opacity-100' : 'opacity-0'}`}>
                  <ReactPlayer
                    ref={playerRef}
                    url={videoUrl}
                    width="100%"
                    height="100%"
                    controls
                    playing={canPlay}
                    playsinline
                    onProgress={handleProgress}
                    onBuffer={handleBuffer}
                    onBufferEnd={handleBufferEnd}
                    onError={handleError}
                    onReady={handleReady}
                    progressInterval={1000}
                    config={{
                      file: {
                        attributes: {
                          preload: "auto",
                          controlsList: "nodownload",
                        },
                        forceVideo: true,
                      },
                    }}
                    played={playedSeconds}
                  />
                </div>
              )}
              {isBuffering && canPlay && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white">Buffering...</div>
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
