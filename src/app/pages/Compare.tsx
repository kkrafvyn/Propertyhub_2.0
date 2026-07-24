import { Link } from "react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Scale, X } from "lucide-react";
import { toast } from "sonner";
import { listingService } from "../../lib/listing.service";
import {
  getCompareIds,
  MAX_COMPARE_LISTINGS,
  toggleCompareIdAsync,
} from "../../lib/compare-listings";
import { useTranslation } from "../i18n/LocaleContext";
import {
  DesktopShell,
  ListingCardImage,
  mapListingToCard,
  PageMeta,
  type MarketplaceListingCard,
} from "../components/baytmiftah";

export function Compare() {
  const { t } = useTranslation();
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [listings, setListings] = useState<MarketplaceListingCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCompareListings = useCallback(async () => {
    const ids = getCompareIds();
    setCompareIds(ids);

    if (ids.length === 0) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const rows = await Promise.all(
        ids.map(async (id) => {
          try {
            return await listingService.getListingById(id);
          } catch {
            return null;
          }
        }),
      );
      setListings(
        rows.filter(Boolean).map((row) => mapListingToCard(row as Parameters<typeof mapListingToCard>[0])),
      );
    } catch (error) {
      console.error("Failed to load compare listings:", error);
      toast.error(t("comparePage.emptyDesc"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCompareListings();
  }, [loadCompareListings]);

  const handleRemove = async (listingId: string) => {
    const { ids } = await toggleCompareIdAsync(listingId);
    setCompareIds(ids);
    setListings((current) => current.filter((listing) => listing.id !== listingId));
  };

  const rows = useMemo(
    () => [
      { key: "price", label: t("comparePage.price"), render: (l: MarketplaceListingCard) => l.priceLabel },
      { key: "location", label: t("comparePage.location"), render: (l: MarketplaceListingCard) => l.location },
      {
        key: "bedrooms",
        label: t("comparePage.bedrooms"),
        render: (l: MarketplaceListingCard) => (l.bedrooms != null ? String(l.bedrooms) : "—"),
      },
      {
        key: "rating",
        label: t("comparePage.rating"),
        render: (l: MarketplaceListingCard) => (l.rating != null ? String(l.rating) : "—"),
      },
      {
        key: "type",
        label: t("comparePage.type"),
        render: (l: MarketplaceListingCard) => l.type ?? l.listingType ?? "—",
      },
      {
        key: "verified",
        label: t("comparePage.verified"),
        render: (l: MarketplaceListingCard) => (l.verified ? t("mobile.appShell.verified") : "—"),
      },
    ],
    [t],
  );

  return (
    <DesktopShell compareCount={compareIds.length} minimal>
      <PageMeta title={t("comparePage.title")} description={t("comparePage.subtitle")} />
      <div className="mx-auto w-full max-w-[var(--max-width-page)] px-4 py-8 sm:px-6 md:px-8 xl:px-20">
        <div className="mb-8 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-subtle">
            <Scale className="h-5 w-5 text-ink-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-ink md:text-3xl">{t("comparePage.title")}</h1>
            <p className="mt-1 text-sm text-ink-secondary md:text-base">{t("comparePage.subtitle")}</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-surface-border bg-surface p-10 text-center text-ink-secondary">
            {t("mobile.mapLoading")}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-border bg-surface-subtle p-10 text-center">
            <h2 className="text-lg font-semibold text-ink">{t("comparePage.emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-secondary">{t("comparePage.emptyDesc")}</p>
            <Link
              to="/search"
              className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {t("mobile.appShell.browseListings")}
            </Link>
          </div>
        ) : (
          <>
            {compareIds.length >= MAX_COMPARE_LISTINGS ? (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t("comparePage.maxReached")}
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="sticky left-0 z-10 bg-surface px-4 py-4 font-semibold text-ink-secondary">
                      &nbsp;
                    </th>
                    {listings.map((listing) => (
                      <th key={listing.id} className="min-w-[220px] px-4 py-4 align-top">
                        <div className="relative overflow-hidden rounded-xl">
                          <ListingCardImage listing={listing} className="aspect-[4/3] w-full object-cover" alt="" />
                          <button
                            type="button"
                            onClick={() => void handleRemove(listing.id)}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface/95 text-ink shadow-sm"
                            aria-label={t("comparePage.remove")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <Link to={`/property/${listing.id}`} className="mt-3 block font-semibold text-ink hover:underline">
                          {listing.title}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-surface-border last:border-b-0">
                      <th className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium text-ink-secondary">
                        {row.label}
                      </th>
                      {listings.map((listing) => (
                        <td key={`${row.key}-${listing.id}`} className="px-4 py-3 text-ink">
                          {row.render(listing)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </DesktopShell>
  );
}
