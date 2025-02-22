
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
        setVideo(videoData);

        // Get signed URL for video
        const { data: urlData, error: urlError } = await supabase.storage
          .from("videos")
          .createSignedUrl(videoData.file_path, 7200); // 2 hours expiry

        if (urlError) throw urlError;
        if (!urlData?.signedUrl) throw new Error("Could not get video URL");
        
        setVideoUrl(urlData.signedUrl);

        // Update view count
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
