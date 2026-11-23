import { useState } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Heart, Star, ShieldCheck } from "lucide-react";
import type { MarketplaceListingCard } from "./listing-mappers";
import { getListingPhotos, useListingPhotoCarousel } from "./useListingPhotoCarousel";

const listingTypeLabels: Record<MarketplaceListingCard["listingType"], string> = {
  rent: "For rent",
  sale: "For sale",
  lease: "For lease",
  stay: "Short stay",
};

interface ListingCardProps {
  listing: MarketplaceListingCard;
  saved?: boolean;
  compared?: boolean;
  onToggleSave?: (id: string) => void;
  onToggleCompare?: (id: string) => void;
  compact?: boolean;
}

export function ListingCard({
  listing,
  saved,
  compared,
  onToggleSave,
  onToggleCompare,
  compact = false,
}: ListingCardProps) {
  const photos = getListingPhotos(listing);
  const [paused, setPaused] = useState(false);
  const [photoIndex, setPhotoIndex] = useListingPhotoCarousel(photos, undefined, paused);

  const widthClass = compact
    ? "w-[min(100%,320px)] shrink-0 sm:w-[300px] lg:w-[320px]"
    : "w-full";

  const listingTypeLabel = listingTypeLabels[listing.listingType];

  return (
    <article
      className={`marketplace-property-card group relative block ${widthClass}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-listing)] bg-surface-subtle transition-all duration-300">
        {photos.length === 0 && (
          <div className="flex h-full w-full items-center justify-center bg-surface-subtle px-4 text-center text-sm text-ink-muted" role="img" aria-label="Property photo unavailable">
            Photo unavailable
          </div>
        )}
        {photos.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={i === photoIndex ? listing.title : ""}
            aria-hidden={i !== photoIndex}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.025] ${
              i === photoIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Subtle ambient vignette for high contrast against photos */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
        <div className="pointer-events-none absolute inset-0 rounded-[var(--radius-listing)] ring-1 ring-inset ring-white/20 dark:ring-white/10" />

        {listing.featured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 dark:bg-surface/90 backdrop-blur-md px-3 py-1 text-xs font-semibold text-ink shadow-xs border border-surface-border/60">
            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
            Featured listing
          </span>
        )}

        {listing.has3DTour ? (
          <span className="absolute right-3 bottom-14 rounded-full bg-primary/90 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm">3D tour</span>
        ) : null}

        {listing.marketLabel ? (
          <span className="absolute left-3 bottom-14 max-w-[85%] truncate rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold text-white border border-white/15 shadow-xs">
            {listing.marketLabel}
          </span>
        ) : null}

        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(listing.id);
            }}
            className="absolute right-3 top-3 z-20 rounded-full p-2.5 transition-all duration-200 hover:scale-110 active:scale-90 bg-black/40 hover:bg-black/65 backdrop-blur-md border border-white/25 shadow-xs cursor-pointer"
            aria-label={saved ? "Remove from saved" : "Save property"}
          >
            <Heart
              className={`h-4 w-4 transition-transform duration-200 ${
                saved ? "fill-brand-orange text-brand-orange scale-110" : "fill-white/30 text-white"
              }`}
            />
          </button>
        )}

        {listingTypeLabel && (
          <span className="absolute bottom-3 left-3 rounded-full bg-surface/90 dark:bg-surface/85 backdrop-blur-md px-3 py-1 text-xs font-semibold text-ink shadow-xs border border-surface-border/60">
            {listingTypeLabel}
          </span>
        )}

        {onToggleCompare && !compact && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCompare(listing.id);
            }}
            className={`absolute bottom-3 right-3 z-20 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs backdrop-blur-md transition-all duration-200 active:scale-95 cursor-pointer ${
              compared
                ? "bg-white text-ink border-white shadow-md scale-105"
                : "border-white/30 bg-black/45 text-white hover:bg-black/70 hover:scale-105"
            }`}
          >
            {compared ? "Added" : "Compare"}
          </button>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
              }}
              className="absolute left-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white opacity-100 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 cursor-pointer"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
              }}
              className="absolute right-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white opacity-100 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-105 hover:bg-black/75 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 cursor-pointer"
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Pagination dots indicator */}
            <div aria-hidden="true" className="pointer-events-none absolute bottom-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {photos.slice(0, 5).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === photoIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="marketplace-property-info space-y-2">
        <p className="marketplace-property-price">{listing.priceLabel}</p>
        {listing.verified && <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verified organization</span>}
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-semibold text-ink group-hover:text-primary transition-colors">
            {listing.location || listing.title}
          </h3>
          {listing.rating ? (
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-ink">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {listing.rating}
            </span>
          ) : null}
        </div>
        <p className="truncate text-sm text-ink-secondary">{listing.title}</p>
        <p className="truncate text-xs sm:text-sm text-ink-muted">
          {listing.bedrooms ? `${listing.bedrooms} beds` : listing.type}
          {listingTypeLabel ? ` · ${listingTypeLabel}` : ""}
        </p>
      </div>
      <Link
        to={`/property/${listing.id}`}
        aria-label={`View ${listing.title} in ${listing.location || "the marketplace"}`}
        className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      />
    </article>
  );
}

export function ListingCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`animate-pulse ${compact ? "w-[min(100%,320px)] shrink-0 sm:w-[300px] lg:w-[320px]" : "w-full"}`}
    >
      <div className="aspect-[4/3] rounded-[var(--radius-listing)] bg-surface-subtle border border-surface-border/50" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-surface-subtle" />
        <div className="h-3 w-1/2 rounded bg-surface-subtle" />
        <div className="h-4 w-1/3 rounded bg-surface-subtle" />
      </div>
    </div>
  );
}
