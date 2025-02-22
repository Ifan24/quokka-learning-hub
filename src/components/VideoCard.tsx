
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface VideoCardProps {
  title: string;
  duration: string;
  views: number;
  description: string;
  thumbnail?: string;
}

const VideoCard = ({
  title,
  duration,
  views,
  description,
  thumbnail,
}: VideoCardProps) => {
  return (
    <Card className="overflow-hidden group animate-fade-in">
      <div className="relative aspect-video bg-muted">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/75 rounded text-xs text-white">
          {duration}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-medium line-clamp-1">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {views.toLocaleString()} views
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {description}
        </p>
      </div>
    </Card>
  );
};

export default VideoCard;
