import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, Loader2, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { isWorkspaceRole } from "../lib/baytmiftah/roles";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { listingService } from "../../lib/listing.service";
import { organizationService } from "../../lib/organization.service";
import { consumerContextService } from "../../lib/consumer-context.service";
import {
  EXPLORE_MODE_IMAGES,
  MobileCarouselSection,
  MobileHomeListingCard,
  MobilePromoCard,
  MobilePropertyTypeRow,
  MobileReferenceHeader,
  MobileTransactionTabs,
  filterHomeListings,
} from "../components/baytmiftah/mobile/MobileHomeSections";
import { exploreModeUrl } from "../lib/consumer-routes";
import { mapListingToCard } from "../components/baytmiftah";
import MobileHomeMenu from "../components/baytmiftah/mobile/MobileHomeMenu";
import { useTranslation } from "../i18n/LocaleContext";
import { useUserMarket } from "../context/MarketContext";
import { ConsumerTabBar } from "./ConsumerTabBar";
import { buildConsumerTabItems } from "./consumer-bottom-tabs";
import { useSurfaceContext } from "../context/SurfaceContext";
import { readCachedMobileListings, writeCachedMobileListings } from "../../lib/mobile-offline-cache";
import "./mobile.css";
import "../../styles/marketplace-editorial.css";

export function MobileAppShell() {
  const navigate = useNavigate();
  const { user, role, signIn } = useAuth();
  const { surface } = useSurfaceContext();
  const { t } = useTranslation();
  const { market, defaultListingMode } = useUserMarket();
  const [menuOpen, setMenuOpen] = useState(false);
  const [txTab, setTxTab] = useState(() => {
    if (defaultListingMode === "buy") return "buy";
    if (defaultListingMode === "stay") return "stay";
    return "rent";
  });
  const [propType, setPropType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [listings, setListings] = useState<any[]>([]);
  const [usingOfflineCache, setUsingOfflineCache] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [contextualNav, setContextualNav] = useState<
    Array<{ label: string; href: string; section: string }>
  >([]);

  const tabs = useMemo(() => buildConsumerTabItems(t, user), [t, user]);

  const handleBiometricSignIn = async (credentials: { username: string; password: string }) => {
    try {
      await signIn(credentials.username, credentials.password);
      toast.success(t("mobile.biometric.signInSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("mobile.biometric.failed"));
    }
  };

  useEffect(() => {
    if (defaultListingMode === "buy") setTxTab("buy");
    else if (defaultListingMode === "stay") setTxTab("stay");
    else setTxTab("rent");
  }, [defaultListingMode]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const [searchResults, agencyRows] = await Promise.all([
          listingService.searchListingsWithCount({}, 48, 0),
          organizationService.getVerifiedAgencies(6).catch(() => []),
        ]);

        if (!cancelled) {
          setListings(searchResults.results || []);
          setAgencies(agencyRows || []);
          setUsingOfflineCache(false);
          writeCachedMobileListings(searchResults.results || []);
        }
      } catch (error) {
        const cached = readCachedMobileListings();
        if (!cancelled && cached.length > 0) {
          setListings(cached as any[]);
          setUsingOfflineCache(true);
        }
        if (!cancelled && !cached.length) setLoadError(true);
        console.error("Failed to load mobile home listings:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (!user) {
      setContextualNav([]);
      return;
    }

    let cancelled = false;

    const loadPrivateData = async () => {
      const nextContext = await consumerContextService.getConsumerContext(user.id).catch(() => ({
        hasBookingContext: false,
        hasRentingContext: false,
        hasBuyingContext: false,
        bookings: [],
        leases: [],
        purchaseDeals: [],
      }));

      if (!cancelled) {
        const journeyNav = consumerContextService.getContextualNavItems(
          {
            hasBookingContext: nextContext.hasBookingContext,
            hasRentingContext: nextContext.hasRentingContext,
            hasBuyingContext: nextContext.hasBuyingContext,
          },
          t,
        );

        const workspaceNav = isWorkspaceRole(role)
          ? [
              { label: t("mobile.menuWorkspace"), href: WORKSPACE_ENTRY_PATH, section: "workspace" },
              {
                label: t("nav.listProperty"),
                href: `${WORKSPACE_ENTRY_PATH}?next=new`,
                section: "new",
              },
            ]
          : [];

        setContextualNav([...workspaceNav, ...journeyNav]);
      }
    };

    void loadPrivateData();

    return () => {
      cancelled = true;
    };
  }, [user, role, t]);

  const cards = listings.map(mapListingToCard);
  const homeListings = filterHomeListings(cards, txTab, propType);
  const modeSearchUrl = exploreModeUrl(
    txTab === "buy" ? "buy" : txTab === "lease" ? "lease" : txTab === "stay" ? "shortStay" : "rent",
  );

  const searchParams = new URLSearchParams(modeSearchUrl.split("?")[1]);
  if (propType && propType !== "shortStay") searchParams.set("propertyType", propType);
  if (propType === "shortStay") searchParams.set("listingType", "short_stay");
  const seeAllTo = `/search?${searchParams.toString()}`;

  const handleTabPress = (tab: { id: string; href: string }) => {
    if (tab.id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigate(
      tab.href,
      tab.href === "/login" ? { state: { from: "/" } } : undefined,
    );
  };

  const hasContextNav = contextualNav.length > 0 && Boolean(user);

  return (
    <main className={`mobile-bolt mobile-app-shell mobile-discovery${hasContextNav ? " has-context-nav" : ""}`}>
      <div className="mobile-content">
        <MobileReferenceHeader
          menuEnabled
          onMenuClick={() => setMenuOpen(true)}
          onBiometricSuccess={(credentials) => void handleBiometricSignIn(credentials)}
          onBiometricError={(message) => toast.error(message)}
        />
        <div className="mobile-discovery-heading px-4 pb-4 pt-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Your property search</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Explore properties</h1>
        </div>
        <form className="mx-4 mb-4 flex min-h-12 items-center gap-3 rounded-xl border border-surface-border bg-surface px-3" onSubmit={(event) => { event.preventDefault(); const query = new FormData(event.currentTarget).get("q"); navigate(`${seeAllTo}&q=${encodeURIComponent(String(query || ""))}`); }}>
          <Search className="h-5 w-5 shrink-0 text-ink-secondary" aria-hidden="true" />
          <input name="q" type="search" aria-label="Search area or city" placeholder="Search area or city" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink outline-none" />
          <button type="submit" aria-label="Search properties" className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-hover text-ink"><Search className="h-4 w-4" /></button>
        </form>
        <MobileTransactionTabs active={txTab} onChange={setTxTab} />
        <MobilePropertyTypeRow active={propType} onChange={setPropType} />
        <div className="mb-3 flex items-center justify-between gap-3 px-4">
          <span className="text-xs text-ink-secondary">Prices in {market?.currency ?? "GHS"}</span>
          <Link to={seeAllTo} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm font-semibold text-ink"><SlidersHorizontal className="h-4 w-4" /> Search & filters</Link>
        </div>

        {usingOfflineCache ? (
          <p className="px-4 text-sm text-muted-foreground">{t("mobile.appShell.offlineCache")}</p>
        ) : null}

        <MobileCarouselSection title={t("mobile.appShell.availableNow")} seeAllTo={seeAllTo}>
          {loading ? (
            <div className="mobile-loading w-full gap-2 px-4" role="status" aria-label="Loading properties">
              <Loader2 aria-hidden="true" />
              <span className="text-sm">Loading properties…</span>
            </div>
          ) : loadError ? (
            <div className="w-full rounded-2xl border border-surface-border bg-surface p-5 text-center" role="alert">
              <p className="text-sm text-ink">Couldn’t load properties. Check your connection.</p>
              <button onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-3 rounded-full border border-surface-border px-4 py-2 text-sm text-ink">Try again</button>
            </div>
          ) : (
            homeListings.length > 0 ? (
              homeListings.slice(0, 8).map((listing) => (
                <MobileHomeListingCard
                  key={listing.id}
                  listing={listing}
                  to={`/property/${listing.id}`}
                />
              ))
            ) : (
              <div className="mobile-discovery-empty w-full rounded-2xl border border-surface-border bg-surface px-5 py-6 text-center">
                <p className="text-sm font-semibold text-ink">{t("searchPage.noPropertiesTitle")}</p>
                <p className="mt-2 text-sm text-ink-secondary">Try another property type or explore more areas.</p>
                {propType && <button type="button" onClick={() => setPropType(null)} className="mt-3 min-h-11 rounded-lg border border-surface-border px-4 text-sm font-semibold text-ink">Clear property type</button>}
                <Link to="/search" className="mt-2 min-h-11 items-center justify-center px-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  {t("home.browseAll")}
                </Link>
              </div>
            )
          )}
        </MobileCarouselSection>

        <section className="mb-7 px-4" aria-labelledby="mobile-discover-title">
          <div className="mb-3 flex items-end justify-between">
            <div><p className="text-xs uppercase tracking-widest text-ink-muted">Explore your options</p><h2 id="mobile-discover-title" className="mt-1 text-lg font-semibold text-ink">Make your next move</h2></div>
          </div>
          <div className="mobile-discovery-grid">
            <MobilePromoCard title={t("mobile.homeScreen.buy")} subtitle={t("mobile.appShell.browseSales")} to={exploreModeUrl("buy")} image={EXPLORE_MODE_IMAGES.buy} />
            <MobilePromoCard title={t("mobile.homeScreen.rent")} subtitle={t("mobile.appShell.monthlyHomes")} to={exploreModeUrl("rent")} image={EXPLORE_MODE_IMAGES.rent} />
            <MobilePromoCard title={t("mobile.homeScreen.stay")} subtitle={t("mobile.appShell.shortStays")} to={exploreModeUrl("shortStay")} image={EXPLORE_MODE_IMAGES.stay} />
            <MobilePromoCard title={t("mobile.homeScreen.lease")} subtitle="Explore longer-term spaces" to={exploreModeUrl("lease")} image={EXPLORE_MODE_IMAGES.lease} />
          </div>
        </section>

        <section className="mobile-section px-4">
          <div className="mobile-section-heading">
            <h2>{t("mobile.appShell.verifiedAgencies")}</h2>
          </div>
          <div className="mobile-agency-row">
            {agencies.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">{t("mobile.appShell.noVerifiedAgencies")}</p>
            ) : agencies.map((agency) => (
              <Link
                key={agency.id}
                to={`/search?agency=${agency.slug}`}
                className="mobile-agency-chip"
              >
                {agency.logo_url ? (
                  <img src={agency.logo_url} alt="" loading="lazy" decoding="async" />
                ) : (
                  <div className="mobile-agency-logo-fallback" aria-hidden="true">
                    <Building2 className="w-5 h-5" />
                  </div>
                )}
                <span>{agency.name}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {contextualNav.length > 0 && user ? (
        <div className="mobile-context-nav" aria-label={t("mobile.appShell.contextNav")}>
          {contextualNav.slice(0, 4).map((item) => (
            <Link key={item.href} to={item.href} className="mobile-context-link">
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <ConsumerTabBar
        tabs={tabs}
        activeId="home"
        onTabPress={handleTabPress}
        ariaLabel={t("mobile.primaryNav")}
      />
      <MobileHomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
