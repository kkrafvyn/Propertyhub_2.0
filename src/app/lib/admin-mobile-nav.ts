import { Capacitor } from "@capacitor/core";
import type { LucideIcon } from "lucide-react";
import { BellRing, FileCheck2, Flame, ShieldAlert } from "lucide-react";

export type AdminMobileTabDef = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
};

export const ADMIN_MOBILE_TABS: AdminMobileTabDef[] = [
  { to: "/admin", labelKey: "adminMobile.alerts", icon: BellRing },
  { to: "/admin/trust", labelKey: "adminMobile.kycQueue", icon: FileCheck2 },
  { to: "/admin/moderation", labelKey: "adminMobile.moderation", icon: ShieldAlert },
  { to: "/admin/revenue", labelKey: "adminMobile.disputes", icon: Flame },
];

export function shouldUseAdminMobileShell(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}
