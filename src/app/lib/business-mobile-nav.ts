import { Capacitor } from "@capacitor/core";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Camera,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Headphones,
  Home,
  KeyRound,
  ListTodo,
  Users,
  Wrench,
} from "lucide-react";
import type { MemberRole } from "../../lib/workspace";
import { isBusinessMobileApp } from "../../lib/mobile-app";
import { canAccessWorkspaceSlug } from "./workspace-role-nav";

export type BusinessMobileJobRole =
  | "property_manager"
  | "finance"
  | "sales"
  | "estate_officer"
  | "technician"
  | "facilities"
  | "customer_service";

export type BusinessMobileTabDef = {
  slug: string;
  labelKey: string;
  icon: LucideIcon;
};

const OVERVIEW_TAB: BusinessMobileTabDef = {
  slug: "",
  labelKey: "mobileShell.tabs.overview",
  icon: Building2,
};

const TAB_SETS: Record<BusinessMobileJobRole, BusinessMobileTabDef[]> = {
  property_manager: [
    OVERVIEW_TAB,
    { slug: "leases", labelKey: "mobileShell.tabs.leases", icon: KeyRound },
    { slug: "maintenance", labelKey: "mobileShell.tabs.maintenance", icon: Wrench },
    { slug: "leads", labelKey: "mobileShell.tabs.leads", icon: Users },
  ],
  finance: [
    OVERVIEW_TAB,
    { slug: "finance", labelKey: "mobileShell.tabs.finance", icon: CreditCard },
    { slug: "payments", labelKey: "mobileShell.tabs.payments", icon: CheckCircle2 },
    { slug: "estate-finance", labelKey: "mobileShell.tabs.arrears", icon: FileSpreadsheet },
  ],
  sales: [
    OVERVIEW_TAB,
    { slug: "leads", labelKey: "mobileShell.tabs.leads", icon: Users },
    { slug: "listings", labelKey: "mobileShell.tabs.listings", icon: Building2 },
    { slug: "tasks", labelKey: "mobileShell.tabs.tasks", icon: ListTodo },
  ],
  estate_officer: [
    OVERVIEW_TAB,
    { slug: "estate-operations", labelKey: "mobileShell.tabs.estate", icon: Home },
    { slug: "inspections", labelKey: "mobileShell.tabs.inspections", icon: Camera },
    { slug: "maintenance", labelKey: "mobileShell.tabs.issues", icon: Wrench },
  ],
  technician: [
    OVERVIEW_TAB,
    { slug: "technician-jobs", labelKey: "mobileShell.tabs.myJobs", icon: Wrench },
    { slug: "inspections", labelKey: "mobileShell.tabs.inspections", icon: Camera },
    { slug: "tasks", labelKey: "mobileShell.tabs.tasks", icon: ListTodo },
  ],
  facilities: [
    OVERVIEW_TAB,
    { slug: "maintenance", labelKey: "mobileShell.tabs.maintenance", icon: Wrench },
    { slug: "inspections", labelKey: "mobileShell.tabs.inspections", icon: Camera },
    { slug: "tasks", labelKey: "mobileShell.tabs.tasks", icon: ListTodo },
  ],
  customer_service: [
    OVERVIEW_TAB,
    { slug: "service-desk", labelKey: "mobileShell.tabs.serviceDesk", icon: Headphones },
    { slug: "tasks", labelKey: "mobileShell.tabs.tasks", icon: ListTodo },
    { slug: "contacts", labelKey: "mobileShell.tabs.contacts", icon: Users },
  ],
};

export function mapMemberRoleToMobileJobRole(
  role: MemberRole | null | undefined,
): BusinessMobileJobRole {
  switch (role) {
    case "technician":
    case "contractor":
      return "technician";
    case "finance_manager":
    case "finance_officer":
    case "collections_officer":
      return "finance";
    case "sales_manager":
    case "sales_agent":
    case "agent":
    case "marketing_manager":
    case "marketing_officer":
      return "sales";
    case "estate_officer":
    case "caretaker":
      return "estate_officer";
    case "facilities_manager":
      return "facilities";
    case "customer_service_manager":
    case "customer_service_agent":
      return "customer_service";
    default:
      return "property_manager";
  }
}

export function getBusinessMobileTabs(
  jobRole: BusinessMobileJobRole,
  organizationSlug: string,
  memberRole: MemberRole | null | undefined,
) {
  const tabs = TAB_SETS[jobRole] ?? TAB_SETS.property_manager;

  return tabs
    .filter((tab) => canAccessWorkspaceSlug(tab.slug, memberRole))
    .map((tab) => ({
      ...tab,
      to: tab.slug
        ? `/workspace/${organizationSlug}/${tab.slug}`
        : `/workspace/${organizationSlug}`,
    }));
}

export function shouldUseBusinessMobileShell(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform() && isBusinessMobileApp();
}
