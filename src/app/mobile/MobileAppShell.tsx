import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  BriefcaseBusiness,
  Building2,
  Camera,
  ChevronRight,
  Heart,
  Home,
  KeyRound,
  Loader2,
  MapPin,
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
import { getPropertyCoverImage } from "../../lib/property-media";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";
import "./mobile.css";

type MobileTab = "discover" | "search" | "saved" | "workspace" | "profile";
type ListingType = "rental" | "sale" | "lease";

const listingTabs: Array<{ label: string; value: ListingType }> = [
  { label: "Rent", value: "rental" },
  { label: "Buy", value: "sale" },
  { label: "Lease", value: "lease" },
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
  const [activeTab, setActiveTab] = useState<MobileTab>("discover");
  const [listingType, setListingType] = useState<ListingType>("rental");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [fieldNote, setFieldNote] = useState("");
  const [lastLocation, setLastLocation] = useState<string | null>(null);

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
        const [listingRows, agencyRows] = await Promise.all([
          listingService.getPublicListings(8, 0),
          organizationService.getVerifiedOrganizations(6),
        ]);

        if (!cancelled) {
          setListings(listingRows || []);
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
      setSaved([]);
      setOrganizations([]);
      return;
    }

    let cancelled = false;

    const loadPrivateData = async () => {
      const [savedRows, orgRows] = await Promise.all([
        savedPropertyService.getSavedProperties(user.id).catch(() => []),
        organizationService.getUserOrganizations(user.id).catch(() => []),
      ]);

      if (!cancelled) {
        setSaved(savedRows || []);
        setOrganizations(orgRows || []);
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
    if (activeTab === "discover") {
      return (
        <>
          <section className="mobile-hero">
            <div>
              <p className="mobile-eyebrow">Ghana property market</p>
              <h1>Find a place that feels settled.</h1>
            </div>
            <button
              type="button"
              className="mobile-icon-button"
              onClick={() => setActiveTab("profile")}
              aria-label="Open profile"
              title="Profile"
            >
              {user ? initials : <UserRound aria-hidden="true" />}
            </button>
          </section>

          <form
            className="mobile-search-bar"
            onSubmit={(event) => {
              event.preventDefault();
              submitSearch();
            }}
          >
            <Search aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Accra, Labone, East Legon"
            />
          </form>

          <section className="mobile-segmented" aria-label="Listing type">
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
          </section>

          {featuredListing && (
            <section className="mobile-feature">
              <Link to={`/property/${featuredListing.id}`} className="mobile-feature-link">
                <img
                  src={getPropertyCoverImage(featuredListing.property)}
                  alt={featuredListing.property?.address || "Featured property"}
                />
                <div>
                  <span>{getListingLabel(featuredListing.listing_type)}</span>
                  <strong>{featuredListing.property?.address}</strong>
                  <p>{formatPrice(featuredListing.price, featuredListing.currency)}</p>
                </div>
              </Link>
            </section>
          )}

          <section className="mobile-section">
            <div className="mobile-section-heading">
              <h2>Fresh listings</h2>
              <Link to="/search">View all</Link>
            </div>
            <div className="mobile-list">
              {loading ? (
                <div className="mobile-loading">
                  <Loader2 aria-hidden="true" />
                </div>
              ) : (
                filteredListings.map((listing) => (
                  <MobilePropertyCard key={listing.id} listing={listing} />
                ))
              )}
            </div>
          </section>

          <section className="mobile-section">
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
                  <img src={agency.logo_url || "https://placehold.co/80x80"} alt="" />
                  <span>{agency.name}</span>
                </Link>
              ))}
            </div>
          </section>
        </>
      );
    }

    if (activeTab === "search") {
      return (
        <section className="mobile-pane">
          <h1>Search</h1>
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

    if (activeTab === "workspace") {
      return (
        <section className="mobile-pane">
          <h1>Workspace</h1>
          <div className="mobile-action-list">
            <Link to={`${WORKSPACE_ENTRY_PATH}?next=new`} className="mobile-action-row">
              <Building2 aria-hidden="true" />
              <span>List a property</span>
              <ChevronRight aria-hidden="true" />
            </Link>
            <Link to={workspacePath} className="mobile-action-row">
              <BriefcaseBusiness aria-hidden="true" />
              <span>Open operations</span>
              <ChevronRight aria-hidden="true" />
            </Link>
            {organizations.map((item) => {
              const organization = item.organization || item;
              return (
                <Link
                  key={organization.id}
                  to={`/workspace/${organization.slug}`}
                  className="mobile-action-row"
                >
                  <ShieldCheck aria-hidden="true" />
                  <span>{organization.name}</span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              );
            })}
          </div>

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
        </section>
      );
    }

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
              Dashboard
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
      </section>
    );
  };

  return (
    <main className="mobile-app-shell">
      <div className="mobile-content">{renderContent()}</div>
      <nav className="mobile-tab-bar" aria-label="Primary mobile navigation">
        <MobileTabButton
          active={activeTab === "discover"}
          icon={Home}
          label="Home"
          onClick={() => setActiveTab("discover")}
        />
        <MobileTabButton
          active={activeTab === "search"}
          icon={Search}
          label="Search"
          onClick={() => setActiveTab("search")}
        />
        <MobileTabButton
          active={activeTab === "saved"}
          icon={Heart}
          label="Saved"
          onClick={() => setActiveTab("saved")}
        />
        <MobileTabButton
          active={activeTab === "workspace"}
          icon={BriefcaseBusiness}
          label="Work"
          onClick={() => setActiveTab("workspace")}
        />
        <MobileTabButton
          active={activeTab === "profile"}
          icon={UserRound}
          label="Me"
          onClick={() => setActiveTab("profile")}
        />
      </nav>
    </main>
  );
}
