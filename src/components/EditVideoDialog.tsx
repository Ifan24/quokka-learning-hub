
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EditVideoDialogProps {
  videoId: string;
  currentTitle: string;
  currentDescription: string;
  currentThumbnail?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateComplete: () => void;
}

export function EditVideoDialog({
  videoId,
  currentTitle,
  currentDescription,
  currentThumbnail,
  open,
  onOpenChange,
  onUpdateComplete,
}: EditVideoDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [description, setDescription] = useState(currentDescription || "");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please provide a title for the video",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);

    try {
      let thumbnailUrl = currentThumbnail;

      // Upload new thumbnail if provided
      if (thumbnail) {
        const thumbnailFileName = `${crypto.randomUUID()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("thumbnails")
          .upload(thumbnailFileName, thumbnail);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("thumbnails")
          .getPublicUrl(thumbnailFileName);

        thumbnailUrl = publicUrl;
      }

      // Update video record
      const { error: updateError } = await supabase
        .from("videos")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", videoId);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Video updated successfully",
      });

      onOpenChange(false);
      onUpdateComplete();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }
      setThumbnail(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Video</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="thumbnail">New Thumbnail (optional)</Label>
            <Input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="cursor-pointer"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={updating}>
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
