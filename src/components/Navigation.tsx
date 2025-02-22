
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  return (
    <nav className="w-full border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-primary text-xl font-bold">
            Quokka
          </Link>
          <div className="hidden md:flex gap-6">
            <Link
              to="/dashboard"
              className="text-secondary hover:text-primary transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/videos"
              className="text-secondary hover:text-primary transition-colors"
            >
              Videos
            </Link>
          </div>
        </div>
        <Button variant="outline">Sign In</Button>
      </div>
    </nav>
  );
};

export default Navigation;
