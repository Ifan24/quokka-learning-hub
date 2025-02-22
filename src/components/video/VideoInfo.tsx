
import { Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import type { VideoDetails } from "@/types/video";

interface VideoInfoProps {
  video: VideoDetails;
}

export const VideoInfo = ({ video }: VideoInfoProps) => {
  return (
    <>
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
    </>
  );
};
