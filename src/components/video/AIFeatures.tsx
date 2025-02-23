
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MessageCircle, BrainCircuit } from "lucide-react";
import { VideoChat } from "./VideoChat";
import { VideoQuiz } from "./VideoQuiz";
import type { VideoDetails } from "@/types/video";

interface AIFeaturesProps {
  video: VideoDetails;
  onSeek: (time: number) => void;
}

export const AIFeatures = ({ video, onSeek }: AIFeaturesProps) => {
  const [activeTab, setActiveTab] = useState<string>("quiz");

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>AI Features</CardTitle>
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(value) => value && setActiveTab(value)}
            className="border rounded-md"
          >
            <ToggleGroupItem value="chat" className="px-3 gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </ToggleGroupItem>
            <ToggleGroupItem value="quiz" className="px-3 gap-2">
              <BrainCircuit className="h-4 w-4" />
              Quiz
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="transition-all duration-200">
          {activeTab === "chat" ? (
            <VideoChat video={video} />
          ) : (
            <VideoQuiz video={video} onSeek={onSeek} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
