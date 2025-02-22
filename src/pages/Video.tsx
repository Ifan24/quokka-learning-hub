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
  const [currentVideo, setCurrentVideo] = useState("");
  const [currentPart, setCurrentPart] = useState(1);
  const [videoParts, setVideoParts] = useState<string[]>([]);

  const checkAndGetVideoParts = async (filePath: string): Promise<string[]> => {
    console.log("Checking for video parts...");
    const parts: string[] = [];
    let partIndex = 1;
    let hasMoreParts = true;

    try {
      while (hasMoreParts) {
        const partPath = `${filePath}.part${partIndex}`;
        console.log(`Checking for part: ${partPath}`);
        
        const { data: partData, error: partError } = await supabase.storage
          .from("videos")
          .createSignedUrl(partPath, 7200);

        if (partError) {
          console.log(`No more parts found after part${partIndex - 1}`);
          hasMoreParts = false;
        } else if (partData?.signedUrl) {
          console.log(`Found part${partIndex}`);
          parts.push(partData.signedUrl);
          partIndex++;
        }
      }

      console.log(`Total video parts found: ${parts.length}`);
      return parts;
    } catch (error) {
      console.error("Error checking video parts:", error);
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

        const parts = await checkAndGetVideoParts(data.file_path);
        if (parts.length === 0) {
          throw new Error("No video parts found");
        }

        setVideoParts(parts);
        setCurrentVideo(parts[0]);
        console.log("Starting with part1");

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
    const partProgress = ((currentPart - 1) / videoParts.length) * 100;
    const currentPartProgress = (loaded * (100 / videoParts.length));
    setLoadingProgress(Math.round(partProgress + currentPartProgress));

    setPlayedSeconds(played);
    localStorage.setItem(`video-progress-${id}`, played.toString());
  };

  const handleEnded = () => {
    const nextPart = currentPart + 1;
    if (nextPart <= videoParts.length) {
      console.log(`Moving to part ${nextPart}`);
      setCurrentPart(nextPart);
      setCurrentVideo(videoParts[nextPart - 1]);
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
      description: `Failed to play part ${currentPart}. Trying to reload...`,
      variant: "destructive",
    });

    if (videoParts[currentPart - 1]) {
      setCurrentVideo(videoParts[currentPart - 1]);
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
                      Part {currentPart}/{videoParts.length} ({Math.round(loadingProgress)}% overall)
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
                  config={{
                    file: {
                      attributes: {
                        preload: "auto",
                        controlsList: "nodownload",
                      },
                      forceVideo: true,
                    },
                  }}
                />
              </div>
              {isBuffering && !isVideoLoading && (
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
