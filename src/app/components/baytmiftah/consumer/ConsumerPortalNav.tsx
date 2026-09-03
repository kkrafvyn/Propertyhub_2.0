import { Link } from "react-router";
import type { LucideIcon } from "lucide-react";

export type ConsumerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: string | null;
  badgeCount?: number | null;
};

type ConsumerPortalNavProps = {
  items: ConsumerNavItem[];
  activeSection: string;
};

export function ConsumerPortalNav({ items, activeSection }: ConsumerPortalNavProps) {
  return (
    <nav
      className="consumer-portal-nav"
      aria-label="Consumer portal sections"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.section === "overview"
            ? activeSection === "overview"
            : item.section
              ? item.section === activeSection
              : false;

        return (
          <Link key={item.href} to={item.href} className="shrink-0">
            <span
              className={`consumer-portal-nav-pill ${active ? "consumer-portal-nav-pill-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.badgeCount && item.badgeCount > 0 ? (
                <span className="consumer-portal-badge">{item.badgeCount}</span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
