
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Play, Pencil, Trash2, Globe2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditVideoDialog } from "./EditVideoDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";

interface VideoCardProps {
  id: string;
  title: string;
  duration: string;
  views: number;
  description: string;
  thumbnail?: string;
  filePath: string;
  isPublic?: boolean;
  userId?: string;
  onDelete?: () => void;
  onUpdate?: () => void;
}

const VideoCard = ({
  id,
  title,
  duration,
  views,
  description,
  thumbnail,
  filePath,
  isPublic = false,
  userId,
  onDelete,
  onUpdate,
}: VideoCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const isOwner = user?.id === userId;

  const handleDelete = async () => {
    try {
      // Delete video file from storage
      const { error: videoError } = await supabase.storage
        .from("videos")
        .remove([filePath]);

      if (videoError) throw videoError;

      // If there's a thumbnail, delete it too
      if (thumbnail) {
        const thumbnailPath = thumbnail.split('/').pop();
        if (thumbnailPath) {
          const { error: thumbnailError } = await supabase.storage
            .from("thumbnails")
            .remove([thumbnailPath]);

          if (thumbnailError) {
            console.error("Error deleting thumbnail:", thumbnailError);
            // Continue with deletion even if thumbnail deletion fails
          }
        }
      }

      // Delete database record
      const { error: dbError } = await supabase
        .from("videos")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Video deleted successfully",
      });

      onDelete?.();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const handlePublish = async () => {
    try {
      const { error } = await supabase
        .from("videos")
        .update({ is_public: !isPublic })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: isPublic ? "Video unpublished successfully" : "Video published successfully",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: isPublic ? "Unpublish failed" : "Publish failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPublishDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden group animate-fade-in">
        <Link to={`/videos/${id}`} className="block">
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
            {isPublic && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/75 rounded text-xs text-white flex items-center gap-1">
                <Globe2 className="w-3 h-3" />
                Public
              </div>
            )}
          </div>
        </Link>
        <div className="p-4">
          <div className="flex items-start justify-between">
            <Link to={`/videos/${id}`} className="flex-1">
              <h3 className="font-medium line-clamp-1">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {views.toLocaleString()} views
              </p>
            </Link>
            {isOwner && (
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => {
                      setIsEditDialogOpen(true);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsPublishDialogOpen(true);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Globe2 className="w-4 h-4 mr-2" />
                    {isPublic ? "Unpublish" : "Publish"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setIsDeleteDialogOpen(true);
                      setIsDropdownOpen(false);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {description}
          </p>
        </div>
      </Card>

      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={isPublishDialogOpen} 
        onOpenChange={setIsPublishDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPublic ? "Unpublish" : "Publish"} Video</AlertDialogTitle>
            <AlertDialogDescription>
              {isPublic 
                ? "Are you sure you want to make this video private? Only you will be able to see it."
                : "Are you sure you want to publish this video? Anyone will be able to see it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>
              {isPublic ? "Unpublish" : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditVideoDialog
        videoId={id}
        currentTitle={title}
        currentDescription={description}
        currentThumbnail={thumbnail}
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setIsDropdownOpen(false);
          }
        }}
        onUpdateComplete={() => {
          onUpdate?.();
        }}
      />
    </>
  );
};

export default VideoCard;
