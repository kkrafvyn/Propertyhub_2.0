import React from "react";
import { NavLink, useParams } from "react-router";
import {
  Building2,
  KeyRound,
  Wrench,
  Users,
  CreditCard,
  CheckCircle2,
  Camera,
  ListTodo,
} from "lucide-react";

export interface BusinessMobileNavProps {
  role?: string | null;
  organizationSlug?: string;
}

export function BusinessMobileNav({ role, organizationSlug = "default" }: BusinessMobileNavProps) {
  const isTechnician = role === "technician";
  const isFinance = role === "finance" || role === "accountant";

  const tabs = isTechnician
    ? [
        { to: `/workspace/${organizationSlug}/technician-jobs`, label: "My Jobs", icon: Wrench },
        { to: `/workspace/${organizationSlug}/inspections`, label: "Inspections", icon: Camera },
        { to: `/workspace/${organizationSlug}/tasks`, label: "Tasks", icon: ListTodo },
      ]
    : isFinance
    ? [
        { to: `/workspace/${organizationSlug}/finance`, label: "Finance", icon: CreditCard },
        { to: `/workspace/${organizationSlug}/payments`, label: "Payments", icon: CheckCircle2 },
        { to: `/workspace/${organizationSlug}/tasks`, label: "Tasks", icon: ListTodo },
      ]
    : [
        { to: `/workspace/${organizationSlug}`, label: "Overview", icon: Building2 },
        { to: `/workspace/${organizationSlug}/leases`, label: "Leases", icon: KeyRound },
        { to: `/workspace/${organizationSlug}/maintenance`, label: "Issues", icon: Wrench },
        { to: `/workspace/${organizationSlug}/leads`, label: "Leads", icon: Users },
      ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-xl">
      <div className="flex items-stretch justify-around px-2 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition ${
                  isActive ? "text-emerald-500 dark:text-emerald-400 font-bold" : "text-muted-foreground hover:text-foreground"
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
  );
}
