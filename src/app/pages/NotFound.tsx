import { Link } from "react-router";
import { Home, MapPin, Search } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StandalonePageShell } from "../components/ux/StandalonePageShell";

export function NotFound() {
  return (
    <StandalonePageShell maxWidthClassName="max-w-lg">
      <div className="py-16 text-center">
        <div className="app-status-pill mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          Error 404 · Page not found
        </div>

        <div
          className="relative mb-4 select-none font-extrabold leading-none tracking-tight"
          style={{
            fontSize: "clamp(6rem, 20vw, 9rem)",
            background: "linear-gradient(135deg, var(--ink) 0%, var(--ink-secondary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </div>

        <h1 className="mb-3 text-2xl font-serif font-semibold tracking-tight text-ink sm:text-3xl">
          This page doesn't exist
        </h1>
        <p className="mx-auto mb-8 max-w-sm text-base leading-relaxed text-ink-secondary">
          The page you're looking for has been moved, renamed, or simply never existed on BaytMiftah.
        </p>

        <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button size="lg" className="gap-2">
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="outline" size="lg" className="gap-2">
              <Search className="h-4 w-4" />
              Search Properties
            </Button>
          </Link>
        </div>

        <Card className="px-6 py-5 text-left">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-secondary">
            Quick navigation
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: "Rentals", to: "/search?listingType=rental" },
              { label: "For Sale", to: "/search?listingType=sale" },
              { label: "Short Stays", to: "/search?listingType=short_stay" },
              { label: "Log In", to: "/login" },
              { label: "Sign Up", to: "/signup" },
              { label: "Help Centre", to: "/help" },
            ].map(({ label, to }) => (
              <Link key={label} to={to}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <MapPin className="h-3 w-3" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </StandalonePageShell>
  );
}
