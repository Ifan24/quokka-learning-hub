
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
  total_parts: number;
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
  const [currentVideo, setCurrentVideo] = useState("");
  const [currentPart, setCurrentPart] = useState(0); // Start with base file (part 0)
  const [videoParts, setVideoParts] = useState<string[]>([]);

  const getVideoUrls = async (videoData: VideoDetails): Promise<string[]> => {
    console.log("Getting video URLs...");
    const urls: string[] = [];
    
    try {
      // First get the base file URL
      const { data: baseData, error: baseError } = await supabase.storage
        .from("videos")
        .createSignedUrl(videoData.file_path, 7200);

      if (baseError) throw baseError;
      if (!baseData?.signedUrl) throw new Error("Could not get base file URL");
      
      console.log("Got base file URL");
      urls.push(baseData.signedUrl);

      // Then get all part URLs based on total_parts
      for (let i = 1; i <= videoData.total_parts; i++) {
        const partPath = `${videoData.file_path}.part${i}`;
        console.log(`Getting URL for part${i}`);
        
        const { data: partData, error: partError } = await supabase.storage
          .from("videos")
          .createSignedUrl(partPath, 7200);

        if (partError) throw partError;
        if (!partData?.signedUrl) throw new Error(`Could not get URL for part${i}`);
        
        urls.push(partData.signedUrl);
      }

      console.log(`Got URLs for all ${urls.length} parts`);
      return urls;
    } catch (error) {
      console.error("Error getting video URLs:", error);
      throw error;
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
        setVideo(data);

        // Get all video URLs at once using total_parts
        const urls = await getVideoUrls(data);
        if (urls.length === 0) {
          throw new Error("No video parts found");
        }

        setVideoParts(urls);
        setCurrentVideo(urls[0]);
        console.log("Starting with base file");

        await supabase
          .from("videos")
          .update({ views: (data.views || 0) + 1 })
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

  const handleProgress = ({ played, loaded }: { played: number; loaded: number }) => {
    // Calculate progress including base file
    const totalParts = video?.total_parts ?? 0;
    const partProgress = (currentPart / (totalParts + 1)) * 100;
    const currentPartProgress = (loaded * (100 / (totalParts + 1)));
    setLoadingProgress(Math.round(partProgress + currentPartProgress));

    setPlayedSeconds(played);
    localStorage.setItem(`video-progress-${id}`, played.toString());
  };

  const handleEnded = () => {
    const nextPart = currentPart + 1;
    if (nextPart < videoParts.length) {
      console.log(`Moving to part ${nextPart}`);
      setCurrentPart(nextPart);
      setCurrentVideo(videoParts[nextPart]);
      setIsVideoLoading(true);
    }
  };

  const handleReady = () => {
    console.log(`Part ${currentPart} ready to play`);
    setIsVideoLoading(false);
  };

  const handleError = (error: any) => {
    console.error("Video playback error:", error);
    toast({
      title: "Playback Error",
      description: `Failed to play ${currentPart === 0 ? 'base file' : `part ${currentPart}`}. Trying to reload...`,
      variant: "destructive",
    });

    if (videoParts[currentPart]) {
      setCurrentVideo(videoParts[currentPart]);
    }
  };

  const handleBuffer = () => {
    console.log("Video buffering");
    setIsBuffering(true);
  };

  const handleBufferEnd = () => {
    console.log("Video buffering ended");
    setIsBuffering(false);
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

  if (!video || videoParts.length === 0) {
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
              {isVideoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                  <div className="text-white text-center mb-4">
                    <div className="mb-2 text-lg font-medium">Loading video...</div>
                    <div className="text-sm text-gray-300">
                      {currentPart === 0 ? 'Base file' : `Part ${currentPart}`} of {videoParts.length} ({Math.round(loadingProgress)}% overall)
                    </div>
                  </div>
                  <div className="w-64">
                    <Progress value={loadingProgress} className="h-2" />
                  </div>
                </div>
              )}
              <div className={`transition-opacity duration-300 ${!isVideoLoading ? 'opacity-100' : 'opacity-0'}`}>
                <ReactPlayer
                  ref={playerRef}
                  key={currentVideo}
                  url={currentVideo}
                  width="100%"
                  height="100%"
                  controls
                  playing={!isVideoLoading}
                  onProgress={handleProgress}
                  onEnded={handleEnded}
                  onReady={handleReady}
                  onBuffer={handleBuffer}
                  onBufferEnd={handleBufferEnd}
                  onError={handleError}
                  progressInterval={500}
                  playsinline
                  config={{
                    file: {
                      forceVideo: true,
                      attributes: {
                        crossOrigin: "anonymous",
                        playsInline: true,
                        controlsList: "nodownload",
                      },
                      forceFLV: false,
                      forceHLS: false,
                      forceDASH: false,
                    }
                  }}
                />
              </div>
              {isBuffering && !isVideoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white">Buffering...</div>
                </div>
              )}
            </div>

            <h1 className="text-2xl font-bold mb-2">{video?.title}</h1>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {video?.views?.toLocaleString() || 0} views
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {video?.created_at && format(new Date(video.created_at), "MMM d, yyyy")}
              </div>
              <div>Duration: {video?.duration}</div>
            </div>

            <Card className="p-4">
              <div>
                <h2 className="font-semibold mb-1">Description</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {video?.description || "No description provided"}
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
