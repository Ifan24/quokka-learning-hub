
import { forwardRef } from "react";
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  url: string;
}

export const VideoPlayer = forwardRef<ReactPlayer, VideoPlayerProps>(({ url }, ref) => {
  return (
    <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6">
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playing
        playsinline
        ref={ref}
        config={{
          file: {
            attributes: {
              crossOrigin: "anonymous",
              controlsList: "nodownload",
            },
          },
        }}
      />
    </div>
  );
});

VideoPlayer.displayName = "VideoPlayer";
