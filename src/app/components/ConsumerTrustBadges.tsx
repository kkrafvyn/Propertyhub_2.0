import { TRUST_LABELS } from "../../lib/legal-disclaimers";
import { TrustBadge } from "./legal/TrustBadge";

export function ConsumerTrustBadges({
  badges,
}: {
  badges: Array<{ id: string; label: string; active: boolean; disclaimer?: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <TrustBadge
          key={badge.id}
          label={badge.label}
          disclaimer={
            badge.disclaimer ||
            TRUST_LABELS.platform_reviewed_listing.disclaimer
          }
          active={badge.active}
        />
      ))}
    </div>
  );
}
