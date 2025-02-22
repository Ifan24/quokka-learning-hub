
import ReactPlayer from "react-player";
import { useState } from "react";

interface VideoPlayerProps {
  url: string;
  playedSeconds: number;
  onProgress: (state: { playedSeconds: number }) => void;
}

export const VideoPlayer = ({ url, playedSeconds, onProgress }: VideoPlayerProps) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  if (!url) {
    return (
      <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6 flex items-center justify-center">
        <p className="text-white">Video URL not available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6 relative">
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playing={false}
        playsinline
        onProgress={onProgress}
        progressInterval={1000}
        onReady={() => {
          setLoading(false);
          setError(null);
        }}
        onError={(e) => {
          console.error("Video playback error:", e);
          setError("Error playing video");
          setLoading(false);
        }}
        onBuffer={() => setLoading(true)}
        onBufferEnd={() => setLoading(false)}
        config={{
          file: {
            attributes: {
              crossorigin: "anonymous",
              controlsList: "nodownload",
            },
            forceVideo: true,
          },
        }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-white">Loading video...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-white">{error}</p>
        </div>
      )}
    </div>
  );
};
