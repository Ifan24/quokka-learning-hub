
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatsCard from "@/components/StatsCard";
import VideoCard from "@/components/VideoCard";
import { Clock, Film, Upload, User } from "lucide-react";
import { VideoUploadDialog } from "@/components/VideoUploadDialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: number;
  thumbnail_url?: string;
  file_path: string;
  created_at: string;
  is_public: boolean;
  user_id: string;
}

const Index = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchVideos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setVideos(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching videos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = () => {
    fetchVideos();
  };

  const handleUpdate = () => {
    fetchVideos();
  };

  const handleUploadComplete = () => {
    fetchVideos();
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Learning Space</h1>
            <p className="text-muted-foreground mt-2">
              Manage your private video content and learning materials
            </p>
          </div>
          <div className="flex w-full md:w-auto items-center gap-4">
            <Input
              placeholder="Search in my videos..."
              className="max-w-sm"
            />
            <VideoUploadDialog onUploadComplete={handleUploadComplete}>
              <Button variant="default" className="inline-flex whitespace-nowrap shrink-0 bg-primary hover:bg-primary/90 text-white">
                <Upload className="w-4 h-4" />
                <span className="ml-2">Upload New Video</span>
              </Button>
            </VideoUploadDialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={<Film className="w-5 h-5" />}
            title="My Videos"
            value={videos.length.toString()}
            subtitle="Total uploaded videos"
          />
          <StatsCard
            icon={<Clock className="w-5 h-5" />}
            title="Learning Time"
            value={`${Math.floor(videos.length * 0.75)} hours`}
            subtitle="Total video content duration"
          />
          <StatsCard
            icon={<User className="w-5 h-5" />}
            title="Completed"
            value="75%"
            subtitle="Videos watched completion rate"
          />
          <StatsCard
            icon={<Upload className="w-5 h-5" />}
            title="Last Upload"
            value={videos.length > 0 ? new Date(videos[0].created_at).toLocaleDateString() : "No uploads"}
            subtitle="Latest content update"
          />
        </div>

        <h2 className="text-2xl font-semibold mb-4">My Videos</h2>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                id={video.id}
                title={video.title}
                duration={video.duration}
                views={video.views || 0}
                description={video.description || ""}
                thumbnail={video.thumbnail_url}
                filePath={video.file_path}
                isPublic={video.is_public}
                userId={video.user_id}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No videos uploaded yet. Click the &quot;Upload New Video&quot; button to get started.
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
