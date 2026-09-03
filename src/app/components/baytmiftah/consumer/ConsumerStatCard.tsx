import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

type ConsumerStatCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "warm" | "info";
  href?: string;
};

const toneClasses = {
  primary: "consumer-stat-icon consumer-stat-icon-primary",
  accent: "consumer-stat-icon consumer-stat-icon-accent",
  warm: "consumer-stat-icon consumer-stat-icon-warm",
  info: "consumer-stat-icon consumer-stat-icon-info",
};

export function ConsumerStatCard({
  label,
  value,
  icon: Icon,
  tone = "primary",
  href,
}: ConsumerStatCardProps) {
  const content = (
    <div className="consumer-stat-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="consumer-stat-value tabular-nums">{value}</p>
          <p className="consumer-stat-label">{label}</p>
        </div>
        <div className={toneClasses[tone]}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block transition-transform hover:-translate-y-0.5">
        {content}
      </Link>
    );
  }

  return content;
}
