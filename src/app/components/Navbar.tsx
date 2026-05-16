import { Link } from "react-router";
import { Menu, User, Heart, Bell, Download } from "lucide-react";
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

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${transparent ? "bg-transparent" : "bg-white border-b border-border shadow-sm"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground">BaytMiftah</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/search" className="text-foreground hover:text-primary transition-colors">
              For Rent
            </Link>
            <Link to="/search?listingType=sale" className="text-foreground hover:text-primary transition-colors">
              For Sale
            </Link>
            <Link to="/search?listingType=lease" className="text-foreground hover:text-primary transition-colors">
              For Lease
            </Link>
            <Link to="/agencies" className="text-foreground hover:text-primary transition-colors">
              Agencies
            </Link>
            <Link to="/guides" className="text-foreground hover:text-primary transition-colors">
              Area Guides
            </Link>
            <Link to="/market-trends" className="text-foreground hover:text-primary transition-colors">
              Trends
            </Link>
            <Link to="/reviews" className="text-foreground hover:text-primary transition-colors">
              Reviews
            </Link>
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/get-the-app" className="text-foreground hover:text-primary transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Get App
            </Link>
            <Link to={workspacePath} className="text-foreground hover:text-primary transition-colors">
              List Property
            </Link>
            <button
              className="p-2 hover:bg-secondary rounded-full transition-colors"
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
                className="p-2 hover:bg-secondary rounded-full transition-colors"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
              </Link>
            )}
            {isAuthenticated ? (
              <Link to="/app" className="flex items-center gap-2 ml-2 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
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
        <div className="md:hidden bg-white border-t border-border">
          <div id="mobile-navigation-menu" className="px-4 py-4 space-y-3">
            <Link to="/search" className="block py-2 text-foreground hover:text-primary">
              For Rent
            </Link>
            <Link to="/search?listingType=sale" className="block py-2 text-foreground hover:text-primary">
              For Sale
            </Link>
            <Link to="/search?listingType=lease" className="block py-2 text-foreground hover:text-primary">
              For Lease
            </Link>
            <Link to="/agencies" className="block py-2 text-foreground hover:text-primary">
              Agencies
            </Link>
            <Link to="/guides" className="block py-2 text-foreground hover:text-primary">
              Area Guides
            </Link>
            <Link to="/market-trends" className="block py-2 text-foreground hover:text-primary">
              Market Trends
            </Link>
            <Link to="/reviews" className="block py-2 text-foreground hover:text-primary">
              Reviews
            </Link>
            <Link to="/buyer-requests" className="block py-2 text-foreground hover:text-primary">
              Buyer Requests
            </Link>
            <Link to="/get-the-app" className="block py-2 text-foreground hover:text-primary">
              Get The App
            </Link>
            <Link to={workspacePath} className="block py-2 text-foreground hover:text-primary">
              List Property
            </Link>
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
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold text-sm">
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
