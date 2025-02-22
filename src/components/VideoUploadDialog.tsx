
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoUploadDialogProps {
  onUploadComplete?: () => void;
}

export const VideoUploadDialog = ({ onUploadComplete }: VideoUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB
        toast({
          title: "File too large",
          description: "Please upload a video file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !title) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a video file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      // Upload the complete file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("videos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Insert video metadata into the database
      const { error: dbError } = await supabase
        .from("videos")
        .insert({
          title,
          description,
          file_path: filePath,
          duration: "0:00", // This will be updated when the video is loaded
          views: 0,
          size: file.size,
          user_id: user.id
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });

      setOpen(false);
      setTitle("");
      setDescription("");
      setFile(null);
      onUploadComplete?.();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Upload New Video
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description"
            />
          </div>
          <div>
            <Label htmlFor="video">Video File</Label>
            <Input
              id="video"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-1">
                Selected file: {file.name}
              </p>
            )}
          </div>
          <Button
            onClick={handleUpload}
            disabled={uploading || !file || !title}
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload Video"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
