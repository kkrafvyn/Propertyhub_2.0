import type { LucideIcon } from "lucide-react";
import {
  Home,
  Building2,
  Calculator,
  Users,
  MessagesSquare,
  Cpu,
  FileBarChart,
  Settings,
  Wrench,
} from "lucide-react";

export type DesktopWorkspaceId =
  | "home"
  | "operations"
  | "finance"
  | "maintenance"
  | "crm"
  | "communications"
  | "ai-automation"
  | "documents-reports"
  | "admin";

export interface DesktopModule {
  slug: string;
  label: string;
}

export interface DesktopWorkspace {
  id: DesktopWorkspaceId;
  label: string;
  icon: LucideIcon;
  /** Default module when entering this workspace */
  landingSlug: string;
  modules: DesktopModule[];
}

/** Maps every routable slug to its parent desktop workspace. */
const SLUG_TO_WORKSPACE: Record<string, DesktopWorkspaceId> = {};

function registerWorkspace(id: DesktopWorkspaceId, slugs: string[]) {
  for (const slug of slugs) {
    SLUG_TO_WORKSPACE[slug] = id;
  }
}

export const DESKTOP_WORKSPACES: DesktopWorkspace[] = [
  {
    id: "home",
    label: "Home / My Work",
    icon: Home,
    landingSlug: "my-work",
    modules: [
      { slug: "my-work", label: "My Work Queue" },
      { slug: "approval-center", label: "Approvals" },
      { slug: "exception-center", label: "Exceptions" },
      { slug: "command-center", label: "Command Center" },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Building2,
    landingSlug: "property-360",
    modules: [
      { slug: "property-360", label: "Property 360" },
      { slug: "listings", label: "Properties & Listings" },
      { slug: "estate-operations", label: "Estates & Units" },
      { slug: "leases", label: "Leases & Occupancy" },
      { slug: "inspections", label: "Inspections" },
      { slug: "unit-360", label: "Unit 360" },
      { slug: "documents", label: "Property Documents" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Calculator,
    landingSlug: "finance",
    modules: [
      { slug: "finance", label: "Finance Dashboard" },
      { slug: "payments", label: "Payments" },
      { slug: "general-ledger", label: "General Ledger" },
      { slug: "chart-of-accounts", label: "Chart of Accounts" },
      { slug: "journal-entries", label: "Journal Entries" },
      { slug: "bank-reconciliation", label: "Bank Reconciliation" },
      { slug: "estate-payables", label: "Accounts Payable" },
      { slug: "owner-statements", label: "Owner Statements" },
      { slug: "portfolio-analytics", label: "Portfolio P&L" },
      { slug: "procurement", label: "Procurement & POs" },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    landingSlug: "maintenance",
    modules: [
      { slug: "maintenance", label: "Dispatch Center" },
      { slug: "contractor-work-orders", label: "Contractor Work Orders" },
      { slug: "technician-jobs", label: "Technician Jobs" },
      { slug: "utility-metering", label: "Utilities & Assets" },
    ],
  },
  {
    id: "crm",
    label: "CRM / Sales",
    icon: Users,
    landingSlug: "leads",
    modules: [
      { slug: "leads", label: "Leads" },
      { slug: "contacts", label: "Contacts" },
      { slug: "leasing-applications", label: "Applications" },
      { slug: "calendar", label: "Viewings & Calendar" },
      { slug: "tasks", label: "Follow-ups & Tasks" },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    icon: MessagesSquare,
    landingSlug: "contextual-inbox",
    modules: [
      { slug: "contextual-inbox", label: "Operations Inbox" },
      { slug: "estate-communications", label: "Client Communications" },
      { slug: "service-desk", label: "Service Desk" },
      { slug: "whatsapp-hub", label: "WhatsApp Hub" },
    ],
  },
  {
    id: "ai-automation",
    label: "AI & Automation",
    icon: Cpu,
    landingSlug: "ai-command-center",
    modules: [
      { slug: "ai-command-center", label: "AI Command Center" },
      { slug: "ai-assistant", label: "AI Copilot" },
      { slug: "automation-builder", label: "Workflow Builder" },
      { slug: "automation", label: "Automations" },
      { slug: "bulk-operations", label: "Bulk Operations" },
    ],
  },
  {
    id: "documents-reports",
    label: "Documents / Reports",
    icon: FileBarChart,
    landingSlug: "financial-statements",
    modules: [
      { slug: "financial-statements", label: "Financial Reports" },
      { slug: "productivity", label: "Living Documents" },
      { slug: "data-import-export", label: "Import / Export" },
      { slug: "market-intelligence", label: "Analytics" },
      { slug: "org-insights", label: "Org Insights" },
    ],
  },
  {
    id: "admin",
    label: "Admin / Settings",
    icon: Settings,
    landingSlug: "settings",
    modules: [
      { slug: "settings", label: "Organization Settings" },
      { slug: "team", label: "Team & Roles" },
      { slug: "integrations", label: "Integrations" },
      { slug: "whitelabel", label: "Branding" },
      { slug: "mobile-settings", label: "Mobile Apps" },
    ],
  },
];

for (const workspace of DESKTOP_WORKSPACES) {
  registerWorkspace(
    workspace.id,
    workspace.modules.map((m) => m.slug),
  );
}

registerWorkspace("home", [""]);

export function getDesktopWorkspaceForPage(page: string): DesktopWorkspaceId {
  return SLUG_TO_WORKSPACE[page] ?? "home";
}

export function getDesktopWorkspace(id: DesktopWorkspaceId): DesktopWorkspace {
  return DESKTOP_WORKSPACES.find((w) => w.id === id) ?? DESKTOP_WORKSPACES[0];
}
