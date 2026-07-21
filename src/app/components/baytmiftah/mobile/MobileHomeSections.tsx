import { Link, NavLink } from "react-router";
import { ChevronLeft, ChevronRight, Heart, Home, Menu, Search, User } from "lucide-react";
import { Logo } from "../Logo";
import { NotificationBell } from "../../NotificationBell";
import { useAuth } from "../../../context/AuthContext";
import { propertyTypeIcons } from "../icons";
import { ListingCardImage } from "../ListingCardImage";
import type { MarketplaceListingCard } from "../listing-mappers";

export function MobileReferenceHeader({
  onMenuClick,
  menuEnabled = false,
}: {
  onMenuClick?: () => void;
  menuEnabled?: boolean;
}) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 bg-surface px-3 pb-3 pt-2 sm:px-4 sm:pt-4">
      <div aria-hidden />
      <Logo to="/" size="sm" className="min-w-0 justify-center" />
      <div className="flex items-center justify-end">
        {menuEnabled ? (
          <>
            {user && <NotificationBell userId={user.id} />}
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-subtle"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </>
        ) : (
          <Link
            to="/app"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-ink"
            aria-label="Profile"
          >
            <User className="h-5 w-5" />
          </Link>
        )}
      </div>
    </header>
  );
}

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80";

export function MobileHeroBanner() {
  return (
    <section className="relative mx-3 mb-5 overflow-hidden rounded-2xl sm:mx-4">
      <img src={HERO_IMAGE} alt="" className="h-[180px] w-full object-cover sm:h-[200px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h2 className="text-lg font-bold leading-tight text-white sm:text-[22px]">
          Find your next home in Ghana
        </h2>
        <p className="mt-1.5 text-sm leading-snug text-white/90">
          Rent, buy, lease, or book short stays with verified agencies.
        </p>
      </div>
    </section>
  );
}

const TX_TABS = ["buy", "rent", "lease", "stay"] as const;

export function MobileTransactionTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  const labels: Record<string, string> = {
    buy: "Buy",
    rent: "Rent",
    lease: "Lease",
    stay: "Stay",
  };

  return (
    <div className="mb-4 grid grid-cols-4 gap-1.5 px-3 sm:gap-2 sm:px-4">
      {TX_TABS.map((id) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex min-w-0 items-center justify-center gap-0.5 rounded-full px-1.5 py-2 text-xs font-semibold transition sm:gap-1 sm:px-2 sm:py-2.5 sm:text-sm ${
              isActive ? "bg-mobile-forest text-white shadow-sm" : "bg-[#F5F5F5] text-ink-secondary"
            }`}
          >
            {id === "stay" && <Home className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{labels[id]}</span>
          </button>
        );
      })}
    </div>
  );
}

const PROPERTY_TYPES = [
  { id: "apartment", label: "Apartments", bg: "bg-blue-50" },
  { id: "house", label: "Houses", bg: "bg-green-50" },
  { id: "townhouse", label: "Townhouses", bg: "bg-orange-50" },
  { id: "commercial", label: "Commercial", bg: "bg-purple-50" },
  { id: "land", label: "Land", bg: "bg-emerald-50" },
  { id: "shortStay", label: "Short stay", bg: "bg-rose-50" },
];

export function MobilePropertyTypeRow({
  active,
  onChange,
}: {
  active: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="mb-6 flex gap-5 overflow-x-auto px-4 sm:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {PROPERTY_TYPES.map(({ id, label, bg }) => {
        const isActive = active === id;
        const Icon = propertyTypeIcons[id] || Home;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(isActive ? null : id)}
            className="flex w-[76px] shrink-0 flex-col items-center gap-2.5 sm:w-[84px]"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-2xl transition sm:h-[3.75rem] sm:w-[3.75rem] ${
                isActive ? "ring-2 ring-mobile-forest ring-offset-2" : ""
              } ${bg}`}
            >
              <Icon className={`h-7 w-7 ${isActive ? "text-mobile-forest" : "text-ink-secondary"}`} />
            </span>
            <span
              className={`text-center text-[11px] font-medium leading-tight sm:text-xs ${isActive ? "text-mobile-forest" : "text-ink-secondary"}`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MobileCarouselSection({
  title,
  seeAllTo,
  children,
}: {
  title: string;
  seeAllTo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        {seeAllTo && (
          <Link to={seeAllTo} className="text-sm font-semibold text-mobile-forest">
            See all
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

export function MobileHomeListingCard({
  listing,
  to,
  badge,
  saved,
  onToggleSave,
}: {
  listing: MarketplaceListingCard;
  to: string;
  badge?: { label: string; tone?: string };
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const displayBadge =
    badge ??
    (listing.verified ? { label: "Verified", tone: "green" } : undefined);

  return (
    <div className="relative w-[min(260px,78vw)] shrink-0">
      <Link
        to={to}
        className="block overflow-hidden rounded-2xl bg-bolt-card shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
      >
        <div className="relative aspect-[4/3]">
          <ListingCardImage listing={listing} className="h-full w-full" alt="" />
          {displayBadge && (
            <span
              className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${
                displayBadge.tone === "blue" ? "bg-blue-500" : "bg-mobile-forest"
              }`}
            >
              {displayBadge.label}
            </span>
          )}
        </div>
        <div className="p-3">
          <p className="truncate font-bold text-ink">{listing.title}</p>
          <p className="mt-1 text-sm font-bold text-mobile-forest">{listing.priceLabel}</p>
        </div>
      </Link>
      {onToggleSave && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleSave(listing.id);
          }}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 shadow-sm"
          aria-label="Save"
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-brand-accent text-brand-accent" : "text-ink"}`} />
        </button>
      )}
    </div>
  );
}

const PROMO_GRADIENTS = [
  "from-emerald-700 to-emerald-900",
  "from-slate-700 to-slate-900",
  "from-teal-700 to-teal-900",
];

export function MobilePromoCard({
  title,
  subtitle,
  to,
  index = 0,
}: {
  title: string;
  subtitle: string;
  to: string;
  index?: number;
}) {
  return (
    <Link
      to={to}
      className={`relative flex h-[160px] w-[130px] shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-white ${PROMO_GRADIENTS[index % PROMO_GRADIENTS.length]}`}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative">
        <p className="text-sm font-bold leading-tight">{title}</p>
        <p className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold text-white/90">
          {subtitle}
          <ChevronRight className="h-3 w-3 shrink-0" />
        </p>
      </div>
    </Link>
  );
}

export function MobileAreaCard({
  area,
  count,
  to,
}: {
  area: { name: string; slug?: string };
  count: number;
  to: string;
}) {
  const image =
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80";

  return (
    <Link to={to} className="relative h-[120px] w-[140px] shrink-0 overflow-hidden rounded-2xl">
      <img src={image} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-sm font-bold text-white">{area.name}</p>
        <p className="text-[11px] text-white/85">{count} properties</p>
      </div>
    </Link>
  );
}

export function filterHomeListings(
  listings: MarketplaceListingCard[],
  txTab: string,
  propType: string | null,
) {
  return (listings ?? []).filter((l) => {
    const matchTx =
      txTab === "buy"
        ? l.listingType === "sale"
        : txTab === "rent"
          ? l.listingType === "rent"
          : txTab === "lease"
            ? l.listingType === "lease"
            : txTab === "stay"
              ? l.listingType === "stay" || l.listingType === "rent"
              : true;

    const matchType = !propType
      ? true
      : propType === "townhouse"
        ? l.type === "house"
        : propType === "shortStay"
          ? l.listingType === "stay"
          : propType === "land"
            ? l.type === "land"
            : l.type === propType;

    return matchTx && matchType;
  });
}

export function MobileHeader({
  title,
  subtitle,
  backTo,
  showLogo = false,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  showLogo?: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        {backTo ? (
          <NavLink
            to={backTo}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle text-ink"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </NavLink>
        ) : showLogo ? (
          <Logo size="sm" showText={false} to="/" />
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-ink">{title}</h1>
          {subtitle && <p className="truncate text-xs text-ink-secondary">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export function MobileSearchBar({
  value,
  onChange,
  placeholder = "Search listings",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 rounded-xl bg-surface-subtle px-4 py-3.5">
        <Search className="h-4 w-4 shrink-0 text-ink-secondary" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-secondary"
        />
      </div>
    </div>
  );
}

export function MobileCategoryChips({
  options,
  active,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map(({ id, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "bg-mobile-forest text-white shadow-sm"
                : "border border-surface-border bg-surface text-ink-secondary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function MobileFiltersRow({ onFiltersClick }: { onFiltersClick: () => void }) {
  return (
    <div className="flex gap-2 px-4 pb-3">
      <button
        type="button"
        onClick={onFiltersClick}
        className="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-ink"
      >
        Filters
      </button>
    </div>
  );
}
