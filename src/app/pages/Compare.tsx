import { Link } from "react-router";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Scale,
  X,
  Star,
  MapPin,
  Bed,
  Bath,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Sparkles,
  Building2,
  Eye,
} from "lucide-react";
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
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/badge";

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
    toast.success("Listing removed from comparison.");
  };

  const handleClearAll = async () => {
    for (const listing of listings) {
      await toggleCompareIdAsync(listing.id);
    }
    setCompareIds([]);
    setListings([]);
    toast.success("Comparison list cleared.");
  };

  const comparisonSections = useMemo(
    () => [
      {
        category: "Pricing & Settlement",
        rows: [
          {
            key: "price",
            label: t("comparePage.price"),
            render: (l: MarketplaceListingCard) => (
              <span className="font-mono font-bold text-base text-ink">{l.priceLabel}</span>
            ),
          },
          {
            key: "type",
            label: "Listing Type",
            render: (l: MarketplaceListingCard) => (
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {l.type ?? l.listingType ?? "Rental"}
              </Badge>
            ),
          },
        ],
      },
      {
        category: "Location & Geography",
        rows: [
          {
            key: "location",
            label: t("comparePage.location"),
            render: (l: MarketplaceListingCard) => (
              <div className="flex items-center gap-1.5 text-xs text-ink font-medium">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>{l.location}</span>
              </div>
            ),
          },
        ],
      },
      {
        category: "Space & Specifications",
        rows: [
          {
            key: "bedrooms",
            label: t("comparePage.bedrooms"),
            render: (l: MarketplaceListingCard) => (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <Bed className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                <span>{l.bedrooms != null ? `${l.bedrooms} Bedroom${l.bedrooms !== 1 ? "s" : ""}` : "—"}</span>
              </div>
            ),
          },
          {
            key: "market",
            label: "Market Tier",
            render: (l: MarketplaceListingCard) => (
              <span className="text-xs font-medium text-ink">
                {l.marketLabel || "Prime Residential"}
              </span>
            ),
          },
        ],
      },
      {
        category: "Trust & Quality Assurance",
        rows: [
          {
            key: "rating",
            label: t("comparePage.rating"),
            render: (l: MarketplaceListingCard) => (
              <div className="flex items-center gap-1.5 text-xs">
                {l.rating != null ? (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-ink">{l.rating}</span>
                    <span className="text-ink-muted">/ 5.0</span>
                  </>
                ) : (
                  <span className="text-ink-muted">New Listing</span>
                )}
              </div>
            ),
          },
          {
            key: "verified",
            label: t("comparePage.verified"),
            render: (l: MarketplaceListingCard) => (
              <div className="flex items-center gap-1.5">
                {l.verified ? (
                  <Badge variant="success" dot className="text-xs font-semibold">
                    Verified Authentic
                  </Badge>
                ) : (
                  <span className="text-xs text-ink-muted">Pending Verification</span>
                )}
              </div>
            ),
          },
        ],
      },
    ],
    [t],
  );

  return (
    <DesktopShell compareCount={compareIds.length} minimal>
      <PageMeta title={t("comparePage.title")} description={t("comparePage.subtitle")} />
      <div className="mx-auto w-full max-w-[var(--max-width-page)] px-4 py-8 sm:px-6 md:px-8 xl:px-20 space-y-8">
        {/* Editorial Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-primary/10 via-emerald-500/5 to-surface/80 border border-primary/20 shadow-lg backdrop-blur-md">
          <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-primary/15 via-emerald-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="info" dot className="text-xs font-bold px-2.5 py-0.5">
                  Side-by-Side Analysis
                </Badge>
                <span className="text-xs text-ink-muted flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-primary" />
                  Compare up to {MAX_COMPARE_LISTINGS} homes
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-display font-medium text-ink tracking-tight">
                {t("comparePage.title")}
              </h1>
              <p className="text-xs sm:text-sm text-ink-secondary max-w-xl leading-relaxed">
                Compare verified properties side by side across pricing, spatial layouts, security features, and trust credentials.
              </p>
            </div>

            {listings.length > 0 && (
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleClearAll()}
                  className="gap-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Matrix</span>
                </Button>
                <Link to="/search">
                  <Button variant="gradient" size="sm" className="gap-1.5 text-xs">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Add More</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-surface-border bg-surface/80 p-12 text-center text-ink-secondary animate-pulse space-y-3">
            <Scale className="w-8 h-8 text-primary mx-auto animate-bounce" />
            <p className="text-sm font-medium">{t("mobile.mapLoading")}</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-surface-border bg-surface-subtle/60 p-12 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-surface-subtle flex items-center justify-center mx-auto text-ink-muted">
              <Scale className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-display font-medium text-ink">{t("comparePage.emptyTitle")}</h2>
              <p className="text-xs text-ink-secondary leading-relaxed">{t("comparePage.emptyDesc")}</p>
            </div>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary/90 transition-all"
            >
              <span>{t("mobile.appShell.browseListings")}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {compareIds.length >= MAX_COMPARE_LISTINGS && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t("comparePage.maxReached")}</span>
              </div>
            )}

            {/* Matrix Table */}
            <div className="overflow-x-auto rounded-3xl border border-surface-border/80 bg-surface/90 backdrop-blur-md shadow-lg">
              <table className="min-w-full border-collapse text-left text-sm">
                {/* Sticky Property Cards Row */}
                <thead>
                  <tr className="border-b border-surface-border/80 bg-surface-subtle/30">
                    <th className="sticky left-0 z-20 bg-surface/95 backdrop-blur-md px-5 py-5 font-semibold text-ink-secondary text-xs uppercase tracking-wider w-48 shrink-0">
                      Property Overview
                    </th>
                    {listings.map((listing) => (
                      <th key={listing.id} className="min-w-[260px] max-w-[320px] px-5 py-5 align-top">
                        <div className="space-y-3">
                          <div className="relative overflow-hidden rounded-2xl border border-surface-border shadow-sm group">
                            <ListingCardImage
                              listing={listing}
                              className="aspect-[16/10] w-full object-cover group-hover:scale-105 transition-transform duration-500"
                              alt=""
                            />
                            <button
                              type="button"
                              onClick={() => void handleRemove(listing.id)}
                              className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-all shadow-sm"
                              aria-label={t("comparePage.remove")}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                            {listing.verified && (
                              <div className="absolute left-2.5 bottom-2.5">
                                <Badge variant="success" dot className="text-[10px] backdrop-blur-md bg-emerald-950/80 text-emerald-300 border-emerald-500/30">
                                  Verified
                                </Badge>
                              </div>
                            )}
                          </div>

                          <div className="space-y-1">
                            <Link
                              to={`/property/${listing.id}`}
                              className="block font-display font-medium text-sm text-ink hover:text-primary transition-colors line-clamp-1"
                            >
                              {listing.title}
                            </Link>
                            <p className="text-xs text-ink-muted truncate">{listing.location}</p>
                          </div>

                          <div className="pt-2 flex items-center gap-2">
                            <Link to={`/property/${listing.id}`} className="w-full">
                              <Button size="sm" variant="gradient" className="w-full text-xs gap-1.5 py-1.5">
                                <Eye className="w-3.5 h-3.5" />
                                <span>Inspect Home</span>
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Categorized Comparison Rows */}
                <tbody>
                  {comparisonSections.map((section) => (
                    <Fragment key={section.category}>
                      <tr className="bg-surface-subtle/50 border-b border-surface-border">
                        <td
                          colSpan={listings.length + 1}
                          className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-primary"
                        >
                          {section.category}
                        </td>
                      </tr>
                      {section.rows.map((row) => (
                        <tr
                          key={row.key}
                          className="border-b border-surface-border/60 hover:bg-surface-subtle/20 transition-colors"
                        >
                          <th className="sticky left-0 z-10 bg-surface/95 backdrop-blur-md px-5 py-3.5 font-medium text-ink-secondary text-xs">
                            {row.label}
                          </th>
                          {listings.map((listing) => (
                            <td key={`${row.key}-${listing.id}`} className="px-5 py-3.5 text-ink text-xs">
                              {row.render(listing)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DesktopShell>
  );
}
