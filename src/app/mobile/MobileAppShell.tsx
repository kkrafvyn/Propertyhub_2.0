import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Building2,
  Camera,
  ChevronRight,
  Compass,
  Heart,
  Home,
  KeyRound,
  Loader2,
  MessageCircle,
  Mic,
  Navigation,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { listingService } from "../../lib/listing.service";
import { organizationService } from "../../lib/organization.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { consumerContextService } from "../../lib/consumer-context.service";
import { getPropertyCoverImage } from "../../lib/property-media";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import { NotificationBell } from "../components/NotificationBell";
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
import "./mobile.css";

type MobileTab = "home" | "explore" | "saved" | "messages" | "profile";
type ListingType = "rental" | "sale" | "lease" | "short_stay";

const listingTabs: Array<{ label: string; value: ListingType }> = [
  { label: "Rent", value: "rental" },
  { label: "Buy", value: "sale" },
  { label: "Lease", value: "lease" },
  { label: "Stay", value: "short_stay" },
];

function formatPrice(amount?: number | null, currency = "GHS") {
  if (!amount) return "Price on request";

  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getListingLabel(type?: string) {
  if (type === "sale") return "For sale";
  if (type === "lease") return "Lease";
  if (type === "short_stay") return "Short stay";
  return "For rent";
}

function MobilePropertyCard({ listing }: { listing: any }) {
  const property = listing.property || {};

  return (
    <Link to={`/property/${listing.id}`} className="mobile-card mobile-property-card">
      <img
        src={getPropertyCoverImage(property)}
        alt={property.address || "Property"}
        className="mobile-property-image"
      />
      <div className="mobile-property-body">
        <div className="mobile-property-meta">
          <span>{getListingLabel(listing.listing_type)}</span>
          {listing.organization?.verified && (
            <span className="mobile-verified">
              <ShieldCheck aria-hidden="true" />
              Verified
            </span>
          )}
          {listing.quality_score >= 75 && (
            <span className="mobile-verified">
              <ShieldCheck aria-hidden="true" />
              Trust {listing.quality_score}
            </span>
          )}
        </div>
        <h3>{property.address || "Ghana property"}</h3>
        <p>
          {[property.neighborhood, property.city, property.region].filter(Boolean).join(", ") || "Ghana"}
        </p>
        <div className="mobile-property-footer">
          <strong>{formatPrice(listing.price, listing.currency)}</strong>
          <span>
            {property.bedrooms ? `${property.bedrooms} bed` : property.category || "Property"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Search;
  title: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="mobile-empty">
      <Icon aria-hidden="true" />
      <p>{title}</p>
      {action && (
        <Link to={action.to} className="mobile-primary-link">
          {action.label}
          <ChevronRight aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function MobileTabButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Home;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`mobile-tab-button ${active ? "is-active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function MobileAppShell() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MobileTab>("home");
  const [txTab, setTxTab] = useState("rent");
  const [propType, setPropType] = useState<string | null>(null);
  const [listingType, setListingType] = useState<ListingType>("rental");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [fieldNote, setFieldNote] = useState("");
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [contextualNav, setContextualNav] = useState<
    Array<{ label: string; href: string; section: string }>
  >([]);

  const initialsSource = user?.user_metadata?.full_name || user?.email || "Property Hub";
  const initials = initialsSource
    .split(/[ @.]/)
    .filter(Boolean)
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [searchResults, agencyRows] = await Promise.all([
          listingService.searchListingsWithCount({ listingType }, 24, 0),
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
  }, [listingType]);

  useEffect(() => {
    if (!user) {
      setSaved([]);
      return;
    }

    let cancelled = false;

    const loadPrivateData = async () => {
      const [savedRows, nextContext] = await Promise.all([
        savedPropertyService.getSavedProperties(user.id).catch(() => []),
        consumerContextService.getConsumerContext(user.id).catch(() => ({
          hasBookingContext: false,
          hasRentingContext: false,
          hasBuyingContext: false,
          bookings: [],
          leases: [],
          purchaseDeals: [],
        })),
      ]);

      if (!cancelled) {
        setSaved(savedRows || []);
        setContextualNav(
          consumerContextService.getContextualNavItems({
            hasBookingContext: nextContext.hasBookingContext,
            hasRentingContext: nextContext.hasRentingContext,
            hasBuyingContext: nextContext.hasBuyingContext,
          })
        );
      }
    };

    void loadPrivateData();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredListings = listings.filter((listing) => {
    const property = listing.property || {};
    const haystack = [property.address, property.city, property.region, property.country]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (listing.listing_type !== listingType) return false;
    if (normalizedQuery && !haystack.includes(normalizedQuery)) return false;
    return true;
  });

  const featuredListing = listings[0];
  const workspacePath = `${WORKSPACE_ENTRY_PATH}?next=dashboard`;

  const submitSearch = () => {
    const params = new URLSearchParams({
      listingType,
    });

    if (query.trim()) params.set("q", query.trim());
    navigate(`/search?${params.toString()}`);
  };

  const saveFieldNote = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const note = {
      id: crypto.randomUUID(),
      note: fieldNote.trim() || "Quick field note",
      location: lastLocation,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem("propertyhub_mobile_field_notes") || "[]");
    localStorage.setItem("propertyhub_mobile_field_notes", JSON.stringify([note, ...existing]));
    setFieldNote("");
    toast.success("Saved offline field note.");
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not available on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const value = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
        setLastLocation(value);
        toast.success("GPS captured for this visit.");
      },
      () => toast.error("Unable to capture GPS. Check location permissions."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const renderContent = () => {
    if (activeTab === "home") {
      const cards = listings.map(mapListingToCard);
      const homeListings = filterHomeListings(cards, txTab, propType);

      return (
        <>
          <MobileReferenceHeader menuEnabled onMenuClick={() => setMenuOpen(true)} />
          <MobileHeroBanner />
          <MobileTransactionTabs active={txTab} onChange={setTxTab} />
          <MobilePropertyTypeRow active={propType} onChange={setPropType} />

          <MobileCarouselSection title="Available now" seeAllTo="/search">
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

          <MobileCarouselSection title="Explore modes">
            <MobilePromoCard title="Buy" subtitle="Browse sales" to="/search?listingType=sale" index={0} />
            <MobilePromoCard title="Rent" subtitle="Monthly homes" to="/search?listingType=rental" index={1} />
            <MobilePromoCard title="Stay" subtitle="Short stays" to="/search?listingType=short_stay" index={2} />
          </MobileCarouselSection>

          <section className="mobile-section px-4">
            <div className="mobile-section-heading">
              <h2>Verified agencies</h2>
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
        </>
      );
    }

    if (activeTab === "explore") {
      return (
        <section className="mobile-pane">
          <h1>Explore</h1>
          <form
            className="mobile-search-stack"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <label>
              <span>Location</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Neighborhood or city"
              />
            </label>
            <div className="mobile-segmented" aria-label="Listing type">
              {listingTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  className={listingType === tab.value ? "is-active" : ""}
                  onClick={() => setListingType(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button type="submit" className="mobile-primary-button">
              <Search aria-hidden="true" />
              Search listings
            </button>
          </form>
          <div className="mobile-list">
            {filteredListings.map((listing) => (
              <MobilePropertyCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === "saved") {
      if (!user) {
        return (
          <section className="mobile-pane">
            <h1>Saved</h1>
            <EmptyState
              icon={Heart}
              title="Log in to keep favorites, alerts, and viewings in one place."
              action={{ label: "Log in", to: "/login" }}
            />
          </section>
        );
      }

      return (
        <section className="mobile-pane">
          <h1>Saved</h1>
          {saved.length ? (
            <div className="mobile-list">
              {saved.map((item) => (
                <MobilePropertyCard key={item.id} listing={item.listing || item} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Heart}
              title="Your saved homes will appear here."
              action={{ label: "Browse listings", to: "/search" }}
            />
          )}
        </section>
      );
    }

    if (activeTab === "messages") {
      if (!user) {
        return (
          <section className="mobile-pane">
            <h1>Messages</h1>
            <EmptyState
              icon={MessageCircle}
              title="Log in to message agents, owners, and property teams."
              action={{ label: "Log in", to: "/login" }}
            />
          </section>
        );
      }

      return (
        <section className="mobile-pane">
          <h1>Messages</h1>
          <EmptyState
            icon={MessageCircle}
            title="Your conversations live in the web dashboard for now."
            action={{ label: "Open messages", to: "/app/messages" }}
          />
        </section>
      );
    }

    if (activeTab === "profile") {
      return (
        <section className="mobile-pane">
          <h1>Profile</h1>
          {user ? (
            <div className="mobile-profile-card">
              <div className="mobile-avatar">{initials}</div>
              <div>
                <strong>{user.user_metadata?.full_name || user.email}</strong>
                <p>{user.email}</p>
              </div>
              <Link to="/app" className="mobile-primary-link">
                My BaytMiftah
                <ChevronRight aria-hidden="true" />
              </Link>
              <Link to="/app/payments" className="mobile-primary-link">
                Payments & receipts
                <ChevronRight aria-hidden="true" />
              </Link>
              <Link to={workspacePath} className="mobile-primary-link">
                Agency workspace
                <ChevronRight aria-hidden="true" />
              </Link>
              <button type="button" className="mobile-secondary-button" onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
          ) : (
            <EmptyState
              icon={KeyRound}
              title="Log in to manage searches, saved listings, payments, and workspace access."
              action={{ label: "Log in", to: "/login" }}
            />
          )}

          {user ? (
            <section className="mobile-agent-kit">
              <div className="mobile-section-heading">
                <h2>Field agent kit</h2>
              </div>
              <div className="mobile-agent-grid">
                <button type="button" onClick={captureLocation}>
                  <Navigation aria-hidden="true" />
                  <span>Capture GPS</span>
                </button>
                <Link to={`${WORKSPACE_ENTRY_PATH}?next=new`}>
                  <Camera aria-hidden="true" />
                  <span>Photo listing</span>
                </Link>
                <Link to="/app/payments">
                  <Wallet aria-hidden="true" />
                  <span>MoMo receipt</span>
                </Link>
                <button
                  type="button"
                  onClick={() => toast.message("Voice notes are queued for native recording setup.")}
                >
                  <Mic aria-hidden="true" />
                  <span>Voice note</span>
                </button>
              </div>
              {lastLocation && <p className="mobile-agent-location">Last GPS: {lastLocation}</p>}
              <textarea
                value={fieldNote}
                onChange={(event) => setFieldNote(event.target.value)}
                placeholder="Quick note from a viewing, inspection, or owner handoff"
              />
              <button type="button" className="mobile-primary-button" onClick={saveFieldNote}>
                Save offline note
              </button>
            </section>
          ) : null}
        </section>
      );
    }

    return null;
  };

  return (
    <main className="mobile-bolt mobile-app-shell">
      <div className="mobile-content">{renderContent()}</div>
      {contextualNav.length > 0 && user ? (
        <div className="mobile-context-nav" aria-label="Contextual navigation">
          {contextualNav.slice(0, 4).map((item) => (
            <Link key={item.href} to={item.href} className="mobile-context-link">
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
      <nav className="mobile-tab-bar" aria-label="Primary mobile navigation">
        <MobileTabButton
          active={activeTab === "home"}
          icon={Home}
          label="Home"
          onClick={() => setActiveTab("home")}
        />
        <MobileTabButton
          active={activeTab === "explore"}
          icon={Compass}
          label="Explore"
          onClick={() => setActiveTab("explore")}
        />
        <MobileTabButton
          active={activeTab === "saved"}
          icon={Heart}
          label="Saved"
          onClick={() => setActiveTab("saved")}
        />
        <MobileTabButton
          active={activeTab === "messages"}
          icon={MessageCircle}
          label="Messages"
          onClick={() => setActiveTab("messages")}
        />
        <MobileTabButton
          active={activeTab === "profile"}
          icon={UserRound}
          label="Profile"
          onClick={() => setActiveTab("profile")}
        />
      </nav>
      <MobileHomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
