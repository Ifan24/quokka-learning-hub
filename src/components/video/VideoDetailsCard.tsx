
import { Card } from "@/components/ui/card";

interface VideoDetailsCardProps {
  userName: string | null;
  description: string | null;
}

export const VideoDetailsCard = ({ userName, description }: VideoDetailsCardProps) => {
  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="font-semibold mb-1">Uploaded by</h2>
        <p className="text-sm text-muted-foreground">
          {userName || "Unknown user"}
        </p>
      </div>

      <div>
        <h2 className="font-semibold mb-1">Description</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {description || "No description provided"}
        </p>
      </div>
    </Card>
  );
};
