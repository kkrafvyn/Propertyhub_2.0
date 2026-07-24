import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { listingService } from "../../lib/listing.service";
import { organizationService } from "../../lib/organization.service";
import { consumerContextService } from "../../lib/consumer-context.service";
import {
  MobileCarouselSection,
  MobileHeroBanner,
  MobileHomeListingCard,
  MobilePromoCard,
  MobilePropertyTypeRow,
  MobileReferenceHeader,
  MobileTransactionTabs,
  filterHomeListings,
} from "../components/baytmiftah/mobile/MobileHomeSections";
import { mapListingToCard } from "../components/baytmiftah";
import MobileHomeMenu from "../components/baytmiftah/mobile/MobileHomeMenu";
import { useTranslation } from "../i18n/LocaleContext";
import { ConsumerTabBar } from "./ConsumerTabBar";
import { buildConsumerTabItems } from "./consumer-bottom-tabs";
import "./mobile.css";

export function MobileAppShell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [txTab, setTxTab] = useState("rent");
  const [propType, setPropType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [contextualNav, setContextualNav] = useState<
    Array<{ label: string; href: string; section: string }>
  >([]);

  const tabs = useMemo(() => buildConsumerTabItems(t, user), [t, user]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [searchResults, agencyRows] = await Promise.all([
          listingService.searchListingsWithCount({ listingType: "rental" }, 24, 0),
          organizationService.getVerifiedOrganizations(6),
        ]);

        if (!cancelled) {
          setListings(searchResults.results || []);
          setAgencies(agencyRows || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

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
        setContextualNav(
          consumerContextService.getContextualNavItems({
            hasBookingContext: nextContext.hasBookingContext,
            hasRentingContext: nextContext.hasRentingContext,
            hasBuyingContext: nextContext.hasBuyingContext,
          }),
        );
      }
    };

    void loadPrivateData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const cards = listings.map(mapListingToCard);
  const homeListings = filterHomeListings(cards, txTab, propType);

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

  return (
    <main className="mobile-bolt mobile-app-shell">
      <div className="mobile-content">
        <MobileReferenceHeader menuEnabled onMenuClick={() => setMenuOpen(true)} />
        <MobileHeroBanner />
        <MobileTransactionTabs active={txTab} onChange={setTxTab} />
        <MobilePropertyTypeRow active={propType} onChange={setPropType} />

        <MobileCarouselSection title={t("mobile.appShell.availableNow")} seeAllTo="/search">
          {loading ? (
            <div className="mobile-loading px-4">
              <Loader2 aria-hidden="true" />
            </div>
          ) : (
            homeListings.slice(0, 8).map((listing) => (
              <MobileHomeListingCard
                key={listing.id}
                listing={listing}
                to={`/property/${listing.id}`}
              />
            ))
          )}
        </MobileCarouselSection>

        <MobileCarouselSection title={t("mobile.appShell.exploreModes")}>
          <MobilePromoCard
            title={t("mobile.homeScreen.buy")}
            subtitle={t("mobile.appShell.browseSales")}
            to="/search?listingType=sale"
            index={0}
          />
          <MobilePromoCard
            title={t("mobile.homeScreen.rent")}
            subtitle={t("mobile.appShell.monthlyHomes")}
            to="/search?listingType=rental"
            index={1}
          />
          <MobilePromoCard
            title={t("mobile.homeScreen.stay")}
            subtitle={t("mobile.appShell.shortStays")}
            to="/search?listingType=short_stay"
            index={2}
          />
        </MobileCarouselSection>

        <section className="mobile-section px-4">
          <div className="mobile-section-heading">
            <h2>{t("mobile.appShell.verifiedAgencies")}</h2>
          </div>
          <div className="mobile-agency-row">
            {agencies.map((agency) => (
              <Link
                key={agency.id}
                to={`/search?agency=${agency.slug}`}
                className="mobile-agency-chip"
              >
                {agency.logo_url ? (
                  <img src={agency.logo_url} alt="" />
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
