import { useLocation, useNavigate } from "react-router";
import { Compass, Heart, Home, MessageCircle, UserRound } from "lucide-react";
import "./mobile.css";

const tabs = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "explore", label: "Explore", icon: Compass, href: "/search" },
  { id: "saved", label: "Saved", icon: Heart, href: "/app/saved" },
  { id: "messages", label: "Messages", icon: MessageCircle, href: "/app/messages" },
  { id: "profile", label: "Profile", icon: UserRound, href: "/app" },
] as const;

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeId = (() => {
    if (location.pathname === "/") return "home";
    if (location.pathname.startsWith("/search")) return "explore";
    if (location.pathname.startsWith("/app/saved")) return "saved";
    if (location.pathname.startsWith("/app/messages")) return "messages";
    if (location.pathname.startsWith("/app")) return "profile";
    if (location.pathname.startsWith("/property/")) return "explore";
    return "";
  })();

  return (
    <nav className="mobile-tab-bar mobile-tab-bar-fixed" aria-label="Mobile navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            className={`mobile-tab-button ${activeId === tab.id ? "is-active" : ""}`}
            onClick={() => navigate(tab.href)}
            aria-current={activeId === tab.id ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
