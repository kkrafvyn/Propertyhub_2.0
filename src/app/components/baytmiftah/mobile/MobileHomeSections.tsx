import { Link, NavLink } from "react-router";
import { ChevronLeft, ChevronRight, Heart, Home, Menu, Search, User } from "lucide-react";
import { Logo } from "../Logo";
import { NotificationBell } from "../../NotificationBell";
import { useAuth } from "../../../context/AuthContext";
import { useTranslation } from "../../../i18n/LocaleContext";
import { propertyTypeIcons } from "../icons";
import { ListingCardImage } from "../ListingCardImage";
import type { MarketplaceListingCard } from "../listing-mappers";
import { MobileBiometricQuickSignIn } from "../../../mobile/MobileBiometricQuickSignIn";

export function MobileReferenceHeader({
  onMenuClick,
  menuEnabled = false,
  onBiometricSuccess,
  onBiometricError,
}: {
  onMenuClick?: () => void;
  menuEnabled?: boolean;
  onBiometricSuccess?: (credentials: { username: string; password: string }) => void;
  onBiometricError?: (message: string) => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2 bg-surface px-3 pb-3 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-4 sm:pt-4">
      <div className="flex min-w-0 items-center justify-start">
        {!user && onBiometricSuccess ? (
          <MobileBiometricQuickSignIn onSuccess={onBiometricSuccess} onError={onBiometricError} />
        ) : null}
      </div>
      <Logo to="/" size="sm" className="min-w-0 justify-center" />
      <div className="flex items-center justify-end">
        {menuEnabled ? (
          <>
            {user && <NotificationBell userId={user.id} />}
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-surface-subtle"
              aria-label={t("mobile.menu")}
            >
              <Menu className="h-5 w-5" />
            </button>
          </>
        ) : (
          <Link
            to="/app/settings"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-subtle text-ink"
            aria-label={t("mobile.profile")}
          >
            <User className="h-5 w-5" />
          </Link>
        )}
      </div>
    </header>
  );
}

const HERO_IMAGE =
  `${import.meta.env.BASE_URL}marketing/hero/residences-mobile.webp`;

export function MobileHeroBanner() {
  const { t } = useTranslation();

  return (
    <section className="marketplace-mobile-hero relative mx-3 mb-5 overflow-hidden sm:mx-4">
      <img src={HERO_IMAGE} alt="Illustrative residential architecture" className="h-[180px] w-full object-cover sm:h-[200px]" />
      <div className="marketplace-mobile-hero-copy py-5">
        <h1 className="font-serif text-3xl leading-tight text-ink">
          {t("mobile.homeScreen.heroTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-secondary">
          {t("mobile.homeScreen.heroSubtitle")}
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
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    buy: t("mobile.homeScreen.buy"),
    rent: t("mobile.homeScreen.rent"),
    lease: t("mobile.homeScreen.lease"),
    stay: t("mobile.homeScreen.stay"),
  };

  return (
    <div className="mb-4 grid grid-cols-4 gap-1.5 px-3 sm:gap-2 sm:px-4">
      {TX_TABS.map((id) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(id)}
            className={`flex min-h-11 min-w-0 items-center justify-center gap-0.5 rounded-full px-1.5 py-2 text-xs font-semibold transition sm:gap-1 sm:px-2 sm:py-2.5 sm:text-sm ${
              isActive ? "bg-mobile-forest text-white shadow-sm" : "bg-surface-subtle text-ink-secondary"
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

const PROPERTY_TYPE_KEYS = [
  { id: "apartment", labelKey: "mobile.homeScreen.apartments", bg: "bg-blue-100 dark:bg-blue-900/30" },
  { id: "house", labelKey: "mobile.homeScreen.houses", bg: "bg-green-100 dark:bg-green-900/30" },
  { id: "townhouse", labelKey: "mobile.homeScreen.townhouses", bg: "bg-orange-100 dark:bg-orange-900/30" },
  { id: "commercial", labelKey: "mobile.homeScreen.commercial", bg: "bg-purple-100 dark:bg-purple-900/30" },
  { id: "land", labelKey: "mobile.homeScreen.land", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  { id: "shortStay", labelKey: "mobile.homeScreen.shortStay", bg: "bg-amber-100 dark:bg-amber-900/30" },
] as const;

export function MobilePropertyTypeRow({
  active,
  onChange,
}: {
  active: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mobile-type-navigation">
      <p className="mobile-type-swipe-hint">Property type <span aria-hidden="true">Swipe to explore →</span></p>
    <div
      className="marketplace-mobile-types mobile-type-scroll mb-6 flex gap-4 overflow-x-auto px-3 sm:gap-5 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t("mobile.homeScreen.propertyTypes")}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === null}
        onClick={() => onChange(null)}
        className="flex w-[68px] shrink-0 snap-start flex-col items-center gap-2 sm:w-[76px]"
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle transition sm:h-14 sm:w-14 ${
            active === null ? "ring-2 ring-mobile-forest ring-offset-2" : ""
          }`}
        >
          <Home className={`h-6 w-6 sm:h-7 sm:w-7 ${active === null ? "text-mobile-forest" : "text-ink-secondary"}`} />
        </span>
        <span
          className={`text-center text-[10px] font-medium leading-tight sm:text-[11px] ${active === null ? "text-mobile-forest" : "text-ink-secondary"}`}
        >
          {t("categoryBar.all")}
        </span>
      </button>
      {PROPERTY_TYPE_KEYS.map(({ id, labelKey, bg }) => {
        const isActive = active === id;
        const Icon = propertyTypeIcons[id] || Home;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(isActive ? null : id)}
            className="flex w-[68px] shrink-0 snap-start flex-col items-center gap-2 sm:w-[76px]"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl transition sm:h-14 sm:w-14 ${
                isActive ? "ring-2 ring-mobile-forest ring-offset-2" : ""
              } ${bg}`}
            >
              <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${isActive ? "text-mobile-forest" : "text-ink-secondary"}`} />
            </span>
            <span
              className={`text-center text-[10px] font-medium leading-tight sm:text-[11px] ${isActive ? "text-mobile-forest" : "text-ink-secondary"}`}
            >
              {t(labelKey)}
            </span>
          </button>
        );
      })}
    </div>
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
  const { t } = useTranslation();

  return (
    <section className="mb-7">
      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        {seeAllTo && (
          <Link to={seeAllTo} className="text-sm font-semibold text-mobile-forest">
            {t("mobile.homeScreen.seeAll")}
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
  const { t } = useTranslation();
  const displayBadge =
    badge ??
    (listing.verified ? { label: t("mobile.appShell.verified"), tone: "green" } : undefined);

  return (
    <div className="relative w-[min(260px,78vw)] shrink-0 snap-start">
      <Link
        to={to}
        className="marketplace-property-card block overflow-hidden"
      >
        <div className="relative aspect-[4/3]">
          <ListingCardImage listing={listing} className="h-full w-full" />
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
        <div className="marketplace-property-info">
          <p className="marketplace-property-price">{listing.priceLabel}</p>
          <p className="mt-2 truncate font-semibold text-ink">{listing.title}</p>
          <p className="mt-1 truncate text-xs text-ink-secondary">{listing.location}</p>
          <p className="mt-2 text-xs text-ink-muted">{listing.bedrooms ? `${listing.bedrooms} beds · ` : ""}{listing.type}</p>
        </div>
      </Link>
      {onToggleSave && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleSave(listing.id);
          }}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 shadow-sm"
          aria-pressed={Boolean(saved)}
          aria-label={saved ? "Remove from saved" : t("listing.save")}
        >
          <Heart className={`h-4 w-4 ${saved ? "fill-brand-orange text-brand-orange" : "text-ink"}`} />
        </button>
      )}
    </div>
  );
}

export const EXPLORE_MODE_IMAGES = {
  buy: `${import.meta.env.BASE_URL}marketing/hero/residences-mobile.webp`,
  rent: `${import.meta.env.BASE_URL}marketing/hero/interior-mobile.webp`,
  lease: `${import.meta.env.BASE_URL}marketing/hero/architecture-mobile.webp`,
  stay: `${import.meta.env.BASE_URL}marketing/hero/community-mobile.webp`,
} as const;

export function MobilePromoCard({
  title,
  subtitle,
  to,
  image,
}: {
  title: string;
  subtitle: string;
  to: string;
  image: string;
}) {
  return (
    <Link
      to={to}
      className="mobile-promo-card relative flex h-[168px] w-[148px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl p-3 text-white shadow-[0_2px_12px_rgba(0,0,0,0.12)]"
    >
      <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
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
  const { t } = useTranslation();
  const image =
    `${import.meta.env.BASE_URL}marketing/hero/interior-mobile.webp`;

  return (
    <Link to={to} className="relative h-[120px] w-[140px] shrink-0 overflow-hidden rounded-2xl">
      <img src={image} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-sm font-bold text-white">{area.name}</p>
        <p className="text-[11px] text-white/85">{t("mobile.homeScreen.propertiesCount", { count })}</p>
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
              ? l.listingType === "stay"
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
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface px-4 py-3">
      <div className="flex items-center gap-3">
        {backTo ? (
          <NavLink
            to={backTo}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle text-ink"
            aria-label={t("mobile.goBack")}
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
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t("mobile.searchListings");

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 rounded-xl bg-surface-subtle px-4 py-3.5">
        <Search className="h-4 w-4 shrink-0 text-ink-secondary" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={resolvedPlaceholder}
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
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 px-4 pb-3">
      <button
        type="button"
        onClick={onFiltersClick}
        className="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-ink"
      >
        {t("mobile.filters")}
      </button>
    </div>
  );
}
