import React, { type ReactNode } from "react";
import { Link, NavLink, useLocation, useParams } from "react-router";
import {
  Building2,
  Wrench,
  KeyRound,
  Users,
  CreditCard,
  CheckCircle2,
  ListTodo,
  FileSpreadsheet,
  Camera,
  Home,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/baytmiftah/Logo";

/**
 * Surface 5: Business Mobile Shell
 * ────────────────────────────────
 * Fast operational execution for field teams:
 *   - Property Manager (Properties, Units, Leases, Maintenance)
 *   - Finance Officer (Payments, Arrears, Installments, Approvals)
 *   - Sales Agent (Leads, Viewings, Offers, Deals)
 *   - Estate Officer (Units, Issues, Inspections, Notices)
 *   - In-house Technician (My Jobs, Photo, Note, Complete)
 */
export interface BusinessMobileShellProps {
  children: ReactNode;
  jobRole?: "property_manager" | "finance" | "sales" | "estate_officer" | "technician";
}

export function BusinessMobileShell({ children, jobRole = "property_manager" }: BusinessMobileShellProps) {
  const { organizationSlug = "default" } = useParams();
  const { role } = useAuth();

  // Define role-specific navigation tabs
  const getNavTabs = () => {
    switch (jobRole) {
      case "technician":
        return [
          { to: `/workspace/${organizationSlug}/technician-jobs`, label: "My Jobs", icon: Wrench },
          { to: `/workspace/${organizationSlug}/inspections`, label: "Inspection", icon: Camera },
          { to: `/workspace/${organizationSlug}/tasks`, label: "Tasks", icon: ListTodo },
        ];
      case "finance":
        return [
          { to: `/workspace/${organizationSlug}/finance`, label: "Finance", icon: CreditCard },
          { to: `/workspace/${organizationSlug}/payments`, label: "Payments", icon: CheckCircle2 },
          { to: `/workspace/${organizationSlug}/estate-finance`, label: "Arrears", icon: FileSpreadsheet },
        ];
      case "sales":
        return [
          { to: `/workspace/${organizationSlug}/leads`, label: "Leads", icon: Users },
          { to: `/workspace/${organizationSlug}/listings`, label: "Listings", icon: Building2 },
          { to: `/workspace/${organizationSlug}/tasks`, label: "Tasks", icon: ListTodo },
        ];
      case "estate_officer":
        return [
          { to: `/workspace/${organizationSlug}/estate-operations`, label: "Estate", icon: Home },
          { to: `/workspace/${organizationSlug}/inspections`, label: "Inspections", icon: Camera },
          { to: `/workspace/${organizationSlug}/maintenance`, label: "Issues", icon: Wrench },
        ];
      case "property_manager":
      default:
        return [
          { to: `/workspace/${organizationSlug}`, label: "Overview", icon: Building2 },
          { to: `/workspace/${organizationSlug}/leases`, label: "Leases", icon: KeyRound },
          { to: `/workspace/${organizationSlug}/maintenance`, label: "Maintenance", icon: Wrench },
          { to: `/workspace/${organizationSlug}/leads`, label: "Leads", icon: Users },
        ];
    }
  };

  const tabs = getNavTabs();

  return (
    <div className="business-mobile-shell min-h-screen bg-background text-foreground pb-20 flex flex-col">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="scale-90" />
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/80">
            {jobRole.replace("_", " ")}
          </span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">Org: {organizationSlug}</span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3">{children}</main>

      {/* Operational Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-xl">
        <div className="flex items-stretch justify-around px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-medium transition ${
                    isActive ? "text-emerald-500 dark:text-emerald-400 font-bold bg-secondary" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
