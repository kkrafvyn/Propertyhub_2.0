import { useLocation, useNavigate } from "react-router";
import { Compass, Heart, Home, MessageCircle, UserRound } from "lucide-react";
import { ConsumerTabBar, type ConsumerTabItem } from "./ConsumerTabBar";
import "./mobile.css";

const tabs: readonly ConsumerTabItem[] = [
  { id: "home", label: "Home", icon: Home, href: "/" },
  { id: "explore", label: "Explore", icon: Compass, href: "/search" },
  { id: "saved", label: "Saved", icon: Heart, href: "/app/saved" },
  { id: "messages", label: "Messages", icon: MessageCircle, href: "/app/messages" },
  { id: "profile", label: "Profile", icon: UserRound, href: "/app" },
] as const;

function resolveActiveId(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/search")) return "explore";
  if (pathname.startsWith("/app/saved")) return "saved";
  if (pathname.startsWith("/app/messages")) return "messages";
  if (pathname.startsWith("/app")) return "profile";
  if (pathname.startsWith("/property/")) return "explore";
  return "";
}

type BottomNavVariant = "phone" | "tablet";

export function MobileBottomNav({ variant = "phone" }: { variant?: BottomNavVariant }) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = resolveActiveId(location.pathname);

  return (
    <ConsumerTabBar
      tabs={tabs}
      activeId={activeId}
      onTabPress={(tab) => navigate(tab.href)}
      className={variant === "tablet" ? "tablet-tab-bar" : ""}
      ariaLabel={variant === "tablet" ? "Tablet navigation" : "Mobile navigation"}
    />
  );
}

export { tabs as consumerTabItems, resolveActiveId as resolveConsumerTabId };
