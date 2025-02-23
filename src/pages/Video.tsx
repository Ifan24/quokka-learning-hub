import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { checkAndDeductCredits } from "@/utils/credits";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VideoChat } from "@/components/video/VideoChat";
import { VideoQuiz } from "@/components/video/VideoQuiz";
import { Loader2 } from "lucide-react";

export default function Video() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { videoId } = useParams();
  const [video, setVideo] = useState<any>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!videoId) {
        console.error("No videoId provided");
        setError("No video ID provided");
        setIsLoading(false);
        return;
      }

      if (!user) {
        console.error("No user found");
        setError("Please login to view this video");
        setIsLoading(false);
        return;
      }

      try {
        console.log("Starting video fetch. VideoID:", videoId, "UserID:", user.id);
        
        const { data, error } = await supabase
          .from("videos")
          .select("*")
          .eq("id", videoId)
          .single();

        if (error) {
          console.error("Supabase error fetching video:", error);
          throw error;
        }

        if (!data) {
          console.error("No video found with ID:", videoId);
          throw new Error("Video not found");
        }

        console.log("Video data received:", data);
        setVideo(data);
        setTranscription(data.transcription_text);
        setNewTitle(data.title);
        setError(null);
      } catch (error: any) {
        console.error("Error in fetchVideo:", error);
        setError(error.message || "Failed to load video");
        toast({
          title: "Error",
          description: error.message || "Failed to load video",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();
  }, [videoId, user, toast]);

  const handleTranscribe = async () => {
    if (!videoId || !user) return;
    
    try {
      await checkAndDeductCredits(user.id);
      
      setIsTranscribing(true);
      const { data, error } = await supabase.functions.invoke("transcribe", {
        body: {
          video_id: videoId,
        },
      });

      if (error) {
        throw error;
      }

      setTranscription(data.transcription_text);
      setVideo((prevVideo: any) => ({
        ...prevVideo,
        transcription_text: data.transcription_text,
      }));

      toast({
        title: "Success!",
        description: "Video transcribed successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to transcribe video",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleUpdateTitle = async () => {
    if (!videoId) return;

    setIsUpdatingTitle(true);
    try {
      const { error } = await supabase
        .from("videos")
        .update({ title: newTitle })
        .eq("id", videoId);

      if (error) {
        throw error;
      }

      setVideo((prevVideo: any) => ({ ...prevVideo, title: newTitle }));
      toast({
        title: "Success!",
        description: "Video title updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update video title",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingTitle(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="flex items-center mb-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading video...</span>
        </div>
        <p className="text-sm text-muted-foreground">Video ID: {videoId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Details:</p>
            <ul className="list-disc pl-4">
              <li>Video ID: {videoId}</li>
              <li>User authenticated: {user ? "Yes" : "No"}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Video not found</h1>
        <p>The requested video could not be found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Video Details</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Video Section */}
        <div className="md:col-span-1">
          <video
            src={video.file_path}
            controls
            className="w-full aspect-video rounded-md"
          />
          <Card>
            <CardHeader>
              <CardTitle>
                <Input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-2xl font-bold leading-none tracking-tight"
                />
              </CardTitle>
              <CardDescription>{video.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Button onClick={handleUpdateTitle} disabled={isUpdatingTitle}>
                {isUpdatingTitle ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Title"
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Uploaded at:{" "}
                {new Date(video.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transcription and AI Features Section */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Transcription</CardTitle>
              <CardDescription>
                {transcription
                  ? "View or update the video transcription."
                  : "Generate the video transcription."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transcription ? (
                <div className="space-y-4">
                  <Label htmlFor="transcription">Transcription:</Label>
                  <Input
                    id="transcription"
                    value={transcription}
                    readOnly
                    className="min-h-[100px] overflow-y-auto"
                  />
                </div>
              ) : (
                <Button onClick={handleTranscribe} disabled={isTranscribing}>
                  {isTranscribing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    "Transcribe"
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="chat">
              <AccordionTrigger>Video Chat</AccordionTrigger>
              <AccordionContent>
                <VideoChat videoId={videoId!} />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="quiz">
              <AccordionTrigger>Video Quiz</AccordionTrigger>
              <AccordionContent>
                <VideoQuiz videoId={videoId!} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </div>
  );
}
