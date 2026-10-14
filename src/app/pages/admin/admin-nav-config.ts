import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CreditCard,
  FileText,
  LifeBuoy,
  MessageSquare,
  Settings,
  Shield,
  ShieldAlert,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import type { AdminConsoleSection } from "../../../lib/platform-access";

export type AdminNavItem = {
  key: AdminConsoleSection;
  label: string;
  href: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { key: "marketing", label: "Marketing page", href: "/admin/marketing", icon: FileText, ownerOnly: true },
  { key: "roles", label: "App roles", href: "/admin/roles", icon: Users, ownerOnly: true },
  { key: "overview", label: "Command Center", href: "/admin", icon: BarChart3 },
  { key: "team", label: "Platform team", href: "/admin/team", icon: Users, ownerOnly: true },
  { key: "integrations", label: "Integrations & jobs", href: "/admin/integrations", icon: Activity },
  { key: "operations", label: "App & API health", href: "/admin/operations", icon: Activity, ownerOnly: true },
  { key: "users", label: "Users", href: "/admin/users", icon: Users },
  { key: "organizations", label: "Organizations", href: "/admin/organizations", icon: Building2 },
  { key: "listings", label: "Listings", href: "/admin/listings", icon: FileText },
  { key: "moderation", label: "Moderation", href: "/admin/moderation", icon: ShieldAlert },
  { key: "fraud", label: "Fraud Radar", href: "/admin/fraud", icon: ShieldAlert },
  { key: "trust", label: "Trust & KYC", href: "/admin/trust", icon: UserCheck },
  { key: "payments", label: "Payments", href: "/admin/payments", icon: CreditCard },
  { key: "communications", label: "Communications", href: "/admin/communications", icon: MessageSquare },
  { key: "ai", label: "Platform AI", href: "/admin/ai", icon: Bot },
  { key: "revenue", label: "Revenue", href: "/admin/revenue", icon: Wallet },
  { key: "support", label: "Support", href: "/admin/support", icon: LifeBuoy },
  { key: "features", label: "Features", href: "/admin/features", icon: Settings, ownerOnly: true },
  { key: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
];

export function adminSectionFromPath(pathname: string): AdminConsoleSection {
  if (pathname.startsWith("/admin/revenue")) return "revenue";
  if (pathname.startsWith("/admin/team")) return "team";
  if (pathname.startsWith("/admin/integrations")) return "integrations";
  if (pathname.startsWith("/admin/operations")) return "operations";
  if (pathname.startsWith("/admin/payments")) return "payments";
  if (pathname.startsWith("/admin/communications")) return "communications";
  if (pathname.startsWith("/admin/ai")) return "ai";
  if (pathname.startsWith("/admin/features")) return "features";
  const section = pathname.split("/")[2] as AdminConsoleSection | undefined;
  return section || "overview";
}
