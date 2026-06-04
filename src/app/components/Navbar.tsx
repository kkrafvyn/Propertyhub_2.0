import { Link } from "react-router";
import { Bell, ChevronDown, Heart, Menu, User } from "lucide-react";
import { Button } from "./ui/Button";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
  transparent?: boolean;
}

export function Navbar({ transparent = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publicMenuOpen, setPublicMenuOpen] = useState(false);
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const workspacePath = `${WORKSPACE_ENTRY_PATH}?next=new`;
  const publicMenuItems = [
    { label: "For Rent", to: "/search", detail: "Browse rentals across Ghana" },
    { label: "For Sale", to: "/search?listingType=sale", detail: "Find homes and investments" },
    { label: "For Lease", to: "/search?listingType=lease", detail: "Explore longer-term leases" },
    { label: "Agencies", to: "/agencies", detail: "Verified real estate teams" },
    { label: "Area Guides", to: "/guides", detail: "Neighborhood insights" },
    { label: "Trends", to: "/market-trends", detail: "Market signals and pricing" },
    { label: "Reviews", to: "/reviews", detail: "Public agency reputation" },
    { label: "Get App", to: "/get-the-app", detail: "Install BaytMiftah mobile" },
    { label: "List Property", to: workspacePath, detail: "Open the agency workspace" },
  ];
  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "PH";

  return (
    <nav className={`fixed left-0 right-0 top-0 z-50 px-3 py-3 transition-all duration-300 ${transparent ? "bg-transparent" : "bg-[#071321]/80 backdrop-blur-xl"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 min-w-0 items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0d1b2a]/92 px-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)] ring-1 ring-[#f2c84b]/10 backdrop-blur-2xl">
          <div className="flex min-w-0 items-center gap-4 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex min-w-0 items-center gap-2">
              <div className="w-10 h-10 flex-shrink-0 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06111d" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <span className="truncate text-lg font-semibold text-foreground sm:text-xl">
                BaytMiftah
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-haspopup="menu"
                  aria-expanded={publicMenuOpen}
                  onClick={() => setPublicMenuOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setPublicMenuOpen(false);
                    }
                  }}
                >
                  Explore
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${publicMenuOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>

                {publicMenuOpen && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-3 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-white/10 bg-[#0d1b2a]/98 p-2 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl"
                  >
                    {publicMenuItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        role="menuitem"
                        className="group block rounded-lg px-4 py-3 transition-colors hover:bg-secondary"
                        onClick={() => setPublicMenuOpen(false)}
                      >
                        <span className="block font-semibold text-foreground group-hover:text-primary">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">{item.detail}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden flex-shrink-0 items-center gap-4 md:flex">
            <button
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
              type="button"
              aria-label="Saved properties"
              title="Saved properties"
            >
              <Heart className="w-5 h-5" />
            </button>
            {isAuthenticated ? (
              <NotificationBell userId={user.id} />
            ) : (
              <Link
                to="/login"
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>
            )}
            {isAuthenticated ? (
              <Link to="/app" className="flex items-center gap-2 ml-2 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-semibold text-sm">
                  {initials}
                </div>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4" />
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            title={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mx-3 mt-2 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-lg border border-white/10 bg-[#0d1b2a]/98 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl md:hidden">
          <div id="mobile-navigation-menu" className="space-y-4 px-4 py-4">
            <div className="rounded-lg border border-border bg-secondary/40 p-2">
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Explore
              </p>
              {publicMenuItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="block rounded-lg px-3 py-2.5 text-foreground hover:bg-primary/10 hover:text-primary"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="block font-semibold">{item.label}</span>
                  <span className="block text-sm text-muted-foreground">{item.detail}</span>
                </Link>
              ))}
            </div>
            {isAuthenticated && (
              <Link
                to={`${WORKSPACE_ENTRY_PATH}?next=notifications`}
                className="block py-2 text-foreground hover:text-primary"
              >
                Notifications
              </Link>
            )}
            <div className="pt-3 border-t border-border space-y-2">
              {isAuthenticated ? (
                <Link to="/app" className="block py-2 text-foreground hover:text-primary flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-semibold text-sm">
                    {initials}
                  </div>
                  My Dashboard
                </Link>
              ) : (
                <>
                  <Link to="/login" className="block">
                    <Button variant="outline" size="sm" className="w-full">
                      Log In
                    </Button>
                  </Link>
                  <Link to="/signup" className="block">
                    <Button size="sm" className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
