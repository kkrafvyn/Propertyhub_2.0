import {
  Compass,
  Heart,
  Home,
  MessageCircle,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { CONSUMER_BOTTOM_TABS } from "../lib/baytmiftah/consumer-nav";
import type { ConsumerTabItem } from "./ConsumerTabBar";

const TAB_ICONS: Record<string, LucideIcon> = {
  home: Home,
  search: Compass,
  heart: Heart,
  message: MessageCircle,
  user: UserRound,
};

type TranslateFn = (key: string) => string;

export function buildConsumerTabItems(
  t: TranslateFn,
  user: { id: string } | null,
): readonly ConsumerTabItem[] {
  return CONSUMER_BOTTOM_TABS.map(({ id, to, labelKey, icon, authRequired }) => {
    const needsAuth = Boolean(authRequired && !user);
    return {
      id,
      label: t(labelKey),
      icon: TAB_ICONS[icon] ?? Home,
      href: needsAuth ? "/login" : to,
    };
  });
}

export function resolveConsumerTabId(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/search") || pathname.startsWith("/property/") || pathname.startsWith("/compare")) return "explore";
  if (pathname.startsWith("/app/saved")) return "saved";
  if (pathname.startsWith("/app/messages")) return "messages";
  if (pathname.startsWith("/app")) return "profile";
  return "";
}
