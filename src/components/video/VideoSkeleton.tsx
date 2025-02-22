
import { Skeleton } from "@/components/ui/skeleton";

export const VideoSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 py-8">
        <Skeleton className="h-[60vh] w-full mb-4" />
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-1/4 mb-4" />
        <Skeleton className="h-20 w-3/4" />
      </div>
    </div>
  );
};
