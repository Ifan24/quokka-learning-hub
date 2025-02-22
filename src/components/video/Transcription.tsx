
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wand2, ChevronDown, ChevronUp } from "lucide-react";
import type { VideoDetails, TranscriptionChunk } from "@/types/video";

interface TranscriptionProps {
  video: VideoDetails;
  isTranscribing: boolean;
  onTranscribe: () => void;
}

export const Transcription = ({ video, isTranscribing, onTranscribe }: TranscriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const renderTranscriptionContent = () => {
    if (video.transcription_status === 'completed' && video.transcription_chunks) {
      return (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Transcription</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isExpanded && (
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {video.transcription_chunks.map((chunk: TranscriptionChunk, index: number) => (
                <div 
                  key={index}
                  className="p-2 hover:bg-accent rounded-md cursor-pointer"
                  onClick={() => {
                    const playerElement = document.querySelector('video');
                    if (playerElement) {
                      playerElement.currentTime = chunk.timestamp[0];
                      playerElement.play();
                    }
                  }}
                >
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(chunk.timestamp[0] / 60)}:
                    {Math.floor(chunk.timestamp[0] % 60).toString().padStart(2, '0')} - 
                    {Math.floor(chunk.timestamp[1] / 60)}:
                    {Math.floor(chunk.timestamp[1] % 60).toString().padStart(2, '0')}
                  </div>
                  <div>{chunk.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (video.transcription_status === 'processing') {
      return (
        <div className="mt-4">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-2">AI Features</h2>
      <div className="space-y-4">
        <div>
          {video?.transcription_status !== 'completed' && (
            <Button
              onClick={onTranscribe}
              disabled={isTranscribing || video?.transcription_status === 'processing'}
              className="w-full"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              {video?.transcription_status === 'processing' || isTranscribing
                ? 'Transcribing...'
                : 'Generate Transcription'}
            </Button>
          )}
          {renderTranscriptionContent()}
        </div>
      </div>
    </Card>
  );
};
