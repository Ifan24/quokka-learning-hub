
import { Eye, Calendar } from "lucide-react";
import { format } from "date-fns";

interface VideoMetadataProps {
  title: string;
  views: number | null;
  createdAt: string;
  duration: string;
}

export const VideoMetadata = ({ title, views, createdAt, duration }: VideoMetadataProps) => {
  return (
    <>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <div className="flex items-center">
          <Eye className="w-4 h-4 mr-1" />
          {views?.toLocaleString() || 0} views
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          {format(new Date(createdAt), "MMM d, yyyy")}
        </div>
        <div>Duration: {duration}</div>
      </div>
    </>
  );
};
