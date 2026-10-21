import { useEffect, useState } from "react";
import { ConsumerTrustBadges } from "./ConsumerTrustBadges";
import { trustCenterService } from "../../lib/trust-center.service";

type Badge = { id: string; label: string; active: boolean; disclaimer?: string };

export function ListingTrustStrip({
  listingId,
  organizationId,
  organizationVerified,
  qualityScore,
  className = "",
}: {
  listingId: string;
  organizationId: string;
  organizationVerified?: boolean;
  qualityScore?: number | null;
  className?: string;
}) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void trustCenterService
      .getConsumerTrustBadges({
        listingId,
        organizationId,
        organizationVerified,
        qualityScore,
      })
      .then((rows) => {
        if (!cancelled) setBadges(rows);
      })
      .catch(() => {
        if (!cancelled) setBadges([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listingId, organizationId, organizationVerified, qualityScore]);

  if (loading || badges.length === 0) return null;

  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground mb-2">Trust & verification</p>
      <ConsumerTrustBadges badges={badges} />
    </div>
  );
}
