
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  url: string;
  playedSeconds: number;
  onProgress: (state: { playedSeconds: number }) => void;
}

export const VideoPlayer = ({ url, playedSeconds, onProgress }: VideoPlayerProps) => {
  if (!url) {
    return (
      <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6 flex items-center justify-center">
        <p className="text-white">Video URL not available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6">
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playing={false}
        playsinline
        onProgress={onProgress}
        progressInterval={1000}
        config={{
          file: {
            attributes: {
              controlsList: "nodownload",
            },
            forceVideo: true,
          },
        }}
        played={playedSeconds}
        fallback={
          <div className="flex items-center justify-center h-full">
            <p className="text-white">Loading video...</p>
          </div>
        }
        onError={(e) => {
          console.error("Video playback error:", e);
        }}
      />
    </div>
  );
};
