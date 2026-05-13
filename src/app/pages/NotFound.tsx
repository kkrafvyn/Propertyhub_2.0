import { Link } from "react-router";
import { Home, Search } from "lucide-react";
import { Button } from "../components/ui/Button";

export function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="text-9xl font-bold text-primary mb-4">404</div>
          <h1 className="text-3xl font-semibold mb-4">Page Not Found</h1>
          <p className="text-muted-foreground text-lg mb-8">
            Sorry, the page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/">
            <Button size="lg">
              <Home className="w-5 h-5" />
              Back to Home
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline" size="lg">
              <Search className="w-5 h-5" />
              Search Properties
            </Button>
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/search" className="text-sm text-primary hover:underline">
              Browse Rentals
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/search?type=sale" className="text-sm text-primary hover:underline">
              Properties for Sale
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/login" className="text-sm text-primary hover:underline">
              Log In
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link to="/signup" className="text-sm text-primary hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
