
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VideoUploadDialogProps {
  onUploadComplete?: () => void;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_FILE_TYPES = ["video/mp4", "video/avi", "video/quicktime"];
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for better upload handling

export function VideoUploadDialog({ onUploadComplete }: VideoUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const generateThumbnail = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration);
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to generate thumbnail"));
          },
          'image/jpeg',
          0.7
        );
      };

      video.onerror = () => reject(new Error("Error loading video"));
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const getVideoDuration = (videoFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = video.duration;
        const minutes = Math.floor(duration / 60);
        const seconds = Math.floor(duration % 60);
        resolve(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };
      
      video.onerror = () => reject(new Error("Error loading video metadata"));
      video.src = URL.createObjectURL(videoFile);
    });
  };

  const uploadChunk = async (
    chunk: Uint8Array,
    fileName: string,
    partNumber: number,
    isLastChunk: boolean
  ): Promise<void> => {
    const chunkFileName = isLastChunk && partNumber === 0 ? fileName : `${fileName}.part${partNumber}`;
    
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(chunkFileName, chunk, {
        contentType: file?.type || 'video/mp4',
        upsert: true
      });

    if (uploadError) throw uploadError;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload MP4, AVI, or MOV files only.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: "Maximum file size is 500MB",
        variant: "destructive",
      });
      return;
    }

    const fileName = selectedFile.name;
    const fileTitle = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    setTitle(fileTitle);
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a file",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload videos",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get video duration and generate thumbnail
      const duration = await getVideoDuration(file);
      setUploadProgress(10);
      
      const thumbnailBlob = await generateThumbnail(file);
      setUploadProgress(20);

      // Upload thumbnail
      const thumbnailFileName = `${crypto.randomUUID()}.jpg`;
      const { error: thumbnailUploadError } = await supabase.storage
        .from("thumbnails")
        .upload(thumbnailFileName, thumbnailBlob);

      if (thumbnailUploadError) throw thumbnailUploadError;
      setUploadProgress(30);

      // Get thumbnail URL
      const { data: { publicUrl: thumbnailUrl } } = supabase.storage
        .from("thumbnails")
        .getPublicUrl(thumbnailFileName);

      // Prepare video upload
      const videoFileName = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
      const fileBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(fileBuffer);
      
      // Split file into chunks
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < fileData.length; i += CHUNK_SIZE) {
        chunks.push(fileData.slice(i, i + CHUNK_SIZE));
      }

      // Upload chunks
      const uploadPromises = chunks.map((chunk, index) => {
        const progress = 30 + Math.round((index / chunks.length) * 50);
        setUploadProgress(progress);
        
        return uploadChunk(
          chunk,
          videoFileName,
          index,
          chunks.length === 1
        );
      });

      await Promise.all(uploadPromises);
      setUploadProgress(80);

      // Create video record
      const { error: dbError } = await supabase.from("videos").insert({
        title,
        description: description.trim() || null,
        file_path: videoFileName,
        thumbnail_url: thumbnailUrl,
        size: file.size,
        duration,
        user_id: user.id,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast({
        title: "Success",
        description: "Video uploaded successfully",
      });

      setOpen(false);
      onUploadComplete?.();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setUploadProgress(0);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      setOpen(newOpen);
    }}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Upload New Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload New Video</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter video description (optional)"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="video">Video File</Label>
            <Input
              id="video"
              type="file"
              accept=".mp4,.avi,.mov,video/mp4,video/avi,video/quicktime"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                {file.name} ({formatFileSize(file.size)})
              </p>
            )}
          </div>
          {uploading && (
            <div className="grid gap-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {uploadProgress}% uploaded
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function for formatting file size
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
