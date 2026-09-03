import { MapPin } from "lucide-react";
import { Badge } from "../ui/badge";
import {
  buildPropertyComplianceSnapshot,
  type PropertyLocationInput,
} from "../../../lib/property-country-context.service";

interface PropertyJurisdictionBadgeProps {
  property?: PropertyLocationInput | null;
  compact?: boolean;
  className?: string;
}

export function PropertyJurisdictionBadge({
  property,
  compact = false,
  className = "",
}: PropertyJurisdictionBadgeProps) {
  if (!property?.country && !property?.city) return null;

  const snapshot = buildPropertyComplianceSnapshot(property ?? {});
  const label = snapshot.subdivisionLabel || snapshot.context.pack.label;

  if (compact) {
    return (
      <Badge variant="secondary" className={`text-[10px] font-medium ${className}`}>
        {label}
      </Badge>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-surface/90 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-ink shadow-sm border border-surface-border/50 ${className}`}
    >
      <MapPin className="h-3 w-3 shrink-0 opacity-70" />
      {label} · {snapshot.context.currency}
    </span>
  );
}
