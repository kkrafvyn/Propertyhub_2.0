import { ShieldCheck } from "lucide-react";
import { Badge } from "./ui/badge";

export function ConsumerTrustBadges({
  badges,
}: {
  badges: Array<{ id: string; label: string; active: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <Badge
          key={badge.id}
          variant={badge.active ? "default" : "outline"}
          className="gap-1"
        >
          {badge.active ? <ShieldCheck className="w-3.5 h-3.5" /> : null}
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}
