
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "./AuthProvider";

const Navigation = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <nav className="w-full border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-primary text-xl font-bold">
            Quokka
          </Link>
          {user && (
            <div className="hidden md:flex gap-6">
              <Link
                to="/dashboard"
                className={`${
                  location.pathname === "/dashboard"
                    ? "text-primary"
                    : "text-secondary"
                } hover:text-primary transition-colors`}
              >
                Dashboard
              </Link>
              <Link
                to="/videos"
                className={`${
                  location.pathname === "/videos"
                    ? "text-primary"
                    : "text-secondary"
                } hover:text-primary transition-colors`}
              >
                Videos
              </Link>
            </div>
          )}
        </div>
        {user ? (
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        ) : (
          <Link to={location.pathname === "/auth" ? "/" : "/auth"}>
            <Button variant="outline">
              {location.pathname === "/auth" ? "Back to Home" : "Sign In"}
            </Button>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
