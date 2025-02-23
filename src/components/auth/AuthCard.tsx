
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface AuthCardProps {
  title: string;
  children: React.ReactNode;
}

export const AuthCard = ({ title, children }: AuthCardProps) => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-md px-4 py-16">
        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">{title}</h1>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </main>
    </div>
  );
};
