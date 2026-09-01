import { Link } from "react-router";
import { Menu, User, Heart, Bell, X, Building2, Plus, Sparkles } from "lucide-react";
import { Button } from "./ui/Button";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { NotificationBell } from "./NotificationBell";
import { GlobalSearch } from "./ux/GlobalSearch";
import { Logo } from "./baytmiftah/Logo";
import { ThemeToggle } from "./baytmiftah/ThemeToggle";

interface NavbarProps {
  transparent?: boolean;
}

export function Navbar({ transparent = false }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const workspacePath = `${WORKSPACE_ENTRY_PATH}?next=new`;
  const initials =
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((part: string) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "PH";
  const fullName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "My Account";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        transparent
          ? "bg-transparent"
          : "bg-white/90 dark:bg-card/90 backdrop-blur-xl border-b border-border/80 shadow-xs"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Logo to="/" size="sm" showText className="gap-2" />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-7">
            <Link
              to="/search"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              For Rent
            </Link>
            <Link
              to="/search?listingType=sale"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              For Sale
            </Link>
            <Link
              to="/search?listingType=lease"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              For Lease
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? <GlobalSearch /> : null}

            <Link
              to={workspacePath}
              className="text-xs sm:text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-full hover:bg-secondary/70 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>List Property</span>
            </Link>

            <Link
              to="/app/saved"
              className="p-2.5 hover:bg-secondary rounded-full transition-colors"
              aria-label="Saved properties"
              title="Saved properties"
            >
              <Heart className="w-4 h-4 text-foreground" />
            </Link>

            {isAuthenticated ? (
              <NotificationBell userId={user.id} />
            ) : (
              <Link
                to="/login"
                className="p-2.5 hover:bg-secondary rounded-full transition-colors"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-foreground" />
              </Link>
            )}

            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                to="/app"
                className="flex items-center gap-2 ml-1 hover:opacity-85 transition-opacity"
                title="Open user dashboard"
              >
                <div className="w-9 h-9 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold text-xs">
                  {initials}
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2 ml-1">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <User className="w-4 h-4 mr-1" />
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="rounded-xl shadow-xs">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu & Search Buttons */}
          <div className="md:hidden flex items-center gap-2">
            {isAuthenticated ? <GlobalSearch /> : null}
            <ThemeToggle />
            <button
              className="p-2.5 hover:bg-secondary rounded-xl transition-colors border border-border/60 bg-surface text-ink"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              title={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-card/95 backdrop-blur-2xl border-t border-border/80 shadow-xl transition-all">
          <div className="px-5 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
            {isAuthenticated && (
              <div className="p-3.5 rounded-2xl bg-surface-subtle border border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold text-sm">
                    {initials}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-ink leading-tight">{fullName}</p>
                    <p className="text-xs text-ink-muted">{user?.email}</p>
                  </div>
                </div>
                <Link
                  to="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Dashboard
                </Link>
              </div>
            )}

            <div className="space-y-1">
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider px-2 mb-1">
                Explore Marketplace
              </p>
              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition"
              >
                <span>For Rent</span>
                <span className="text-xs text-muted-foreground">Rentals</span>
              </Link>
              <Link
                to="/search?listingType=sale"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition"
              >
                <span>For Sale</span>
                <span className="text-xs text-muted-foreground">Properties</span>
              </Link>
              <Link
                to="/search?listingType=lease"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition"
              >
                <span>For Lease</span>
                <span className="text-xs text-muted-foreground">Commercial</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-border space-y-1">
              <p className="text-[11px] font-bold text-ink-muted uppercase tracking-wider px-2 mb-1">
                Services & Portals
              </p>
              <Link
                to={workspacePath}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition"
              >
                <Building2 className="w-4 h-4 text-primary" />
                <span>Professional Workspace & List</span>
              </Link>
              <Link
                to="/app/saved"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition"
              >
                <Heart className="w-4 h-4 text-brand-orange" />
                <span>Saved Properties</span>
              </Link>
              {isAuthenticated && (
                <Link
                  to="/app/messages"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Messages & Conversations</span>
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              {isAuthenticated ? (
                <Link
                  to="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block"
                >
                  <Button className="w-full rounded-xl">Open My Dashboard</Button>
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="outline" size="sm" className="w-full rounded-xl">
                      Log In
                    </Button>
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button size="sm" className="w-full rounded-xl">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
