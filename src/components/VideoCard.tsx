
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Play, Pencil, Trash2 } from "lucide-react";
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

interface VideoCardProps {
  id: string;
  title: string;
  duration: string;
  views: number;
  description: string;
  thumbnail?: string;
  filePath: string;
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
  onDelete,
  onUpdate,
}: VideoCardProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      // First attempt to delete from database
      const { error: dbError } = await supabase
        .from("videos")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      // If database deletion is successful, try to delete from storage
      // Even if storage deletion fails, we'll consider it a success since the DB record is gone
      try {
        await supabase.storage
          .from("videos")
          .remove([filePath]);
      } catch (storageError) {
        console.error("Storage deletion error (non-critical):", storageError);
      }

      toast({
        title: "Success",
        description: "Video deleted successfully",
      });

      onDelete?.();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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
              {duration || "0:00"}
            </div>
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
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
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
