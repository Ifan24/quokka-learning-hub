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
  const [videoUrl, setVideoUrl] = useState<string[]>([]);
  const [canPlay, setCanPlay] = useState(false);

  const getSignedUrls = async (filePath: string): Promise<string[]> => {
    console.log("Getting signed URLs for video parts...");
    const urls: string[] = [];
    let partIndex = 0;
    let hasMoreParts = true;

    try {
      // Get the base file
      const { data: baseData, error: baseError } = await supabase.storage
        .from("videos")
        .createSignedUrl(filePath, 7200);

      if (baseError) throw baseError;
      if (baseData?.signedUrl) {
        console.log("Got base file URL");
        urls.push(baseData.signedUrl);
      }

      // Get all the parts
      while (hasMoreParts) {
        const partPath = `${filePath}.part${partIndex}`;
        const { data, error } = await supabase.storage
          .from("videos")
          .createSignedUrl(partPath, 7200);

        if (error) {
          console.log(`No more parts found after part${partIndex}`);
          hasMoreParts = false;
        } else if (data?.signedUrl) {
          console.log(`Got URL for part${partIndex}`);
          urls.push(data.signedUrl);
          partIndex++;
        }
      }

      console.log(`Total video parts found: ${urls.length}`);
      return urls;
    } catch (error) {
      console.error("Error getting signed URLs:", error);
      throw error;
    }
  };

  const refreshVideoUrl = async (filePath: string) => {
    try {
      const urls = await getSignedUrls(filePath);
      if (urls.length === 0) {
        throw new Error("No video parts found");
      }
      setVideoUrl(urls);
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

        let lastLoadedPercent = 0;
        const updateLoadingProgress = () => {
          try {
            if (videoElement.buffered && videoElement.buffered.length > 0 && videoElement.duration) {
              const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
              const duration = videoElement.duration;
              const loadedPercent = Math.round((bufferedEnd / duration) * 100);
              
              console.log(`Buffered end: ${bufferedEnd}, Duration: ${duration}, Progress: ${loadedPercent}%`);
              
              if (loadedPercent !== lastLoadedPercent) {
                setLoadingProgress(loadedPercent);
                lastLoadedPercent = loadedPercent;

                if (loadedPercent >= 95) {
                  console.log("Video mostly loaded, enabling playback");
                  setIsVideoLoading(false);
                  setCanPlay(true);
                }
              }
            } else {
              console.log("Waiting for video metadata...");
            }
          } catch (error) {
            console.error("Error updating progress:", error);
          }
        };

        // Listen for metadata loading
        videoElement.addEventListener('loadedmetadata', () => {
          console.log("Video metadata loaded");
          console.log(`Video duration: ${videoElement.duration}`);
          updateLoadingProgress();
        });

        // Track loading progress
        videoElement.addEventListener('progress', () => {
          console.log("Progress event fired");
          updateLoadingProgress();
        });

        // Additional loading events
        videoElement.addEventListener('loadeddata', () => {
          console.log("Initial video data loaded");
          updateLoadingProgress();
        });

        videoElement.addEventListener('canplay', () => {
          console.log("Video can start playing");
          updateLoadingProgress();
        });

        videoElement.addEventListener('canplaythrough', () => {
          console.log("Video can play through");
          updateLoadingProgress();
        });

        console.log("Starting video load");
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

  if (!video || videoUrl.length === 0) {
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
