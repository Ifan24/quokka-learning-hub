
import ReactPlayer from "react-player";

interface VideoPlayerProps {
  url: string;
  playedSeconds: number;
  onProgress: (state: { playedSeconds: number }) => void;
}

export const VideoPlayer = ({ url, playedSeconds, onProgress }: VideoPlayerProps) => {
  return (
    <div className="rounded-lg overflow-hidden bg-black aspect-video mb-6">
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playing
        playsinline
        onProgress={onProgress}
        progressInterval={1000}
        config={{
          file: {
            attributes: {
              controlsList: "nodownload",
            },
          },
        }}
        played={playedSeconds}
      />
    </div>
  );
};
