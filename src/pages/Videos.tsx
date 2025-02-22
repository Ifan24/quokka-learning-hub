
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import VideoCard from "@/components/VideoCard";
import { supabase } from "@/integrations/supabase/client";
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

const Videos = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("is_public", true)
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Public Videos</h1>
            <p className="text-muted-foreground mt-2">
              Browse and learn from public videos shared by the community
            </p>
          </div>
          <Input
            placeholder="Search in public videos..."
            className="max-w-sm"
          />
        </div>

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
                onUpdate={fetchVideos}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No public videos available yet.
          </div>
        )}
      </main>
    </div>
  );
};

export default Videos;
