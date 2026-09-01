import React from "react";
import { NavLink } from "react-router";
import { BellRing, ShieldAlert, FileCheck2, Flame } from "lucide-react";

export function AdminMobileNav() {
  const tabs = [
    { to: "/admin", label: "Alerts", icon: BellRing },
    { to: "/admin/trust-review", label: "KYC Queue", icon: FileCheck2 },
    { to: "/admin/fraud", label: "Fraud Risks", icon: ShieldAlert },
    { to: "/admin/revenue", label: "Disputes", icon: Flame },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border shadow-xl">
      <div className="flex items-stretch justify-around px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-1 rounded-lg text-[10px] font-medium transition ${
                  isActive ? "text-rose-400 font-bold bg-secondary" : "text-muted-foreground hover:text-foreground"
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
