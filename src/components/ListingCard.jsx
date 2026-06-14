import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconHeart, IconStar } from './icons'
import { useTranslation } from '../i18n/LocaleContext'

export default function ListingCard({
  listing,
  saved,
  compared,
  onToggleSave,
  onToggleCompare,
  compact = false,
}) {
  const { t } = useTranslation()
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = listing.photos?.length ? listing.photos : [listing.image]
  const widthClass = compact ? 'w-[280px] shrink-0' : 'w-full'

  return (
    <Link to={`/property/${listing.id}`} className={`group block ${widthClass}`}>
      <div className="relative aspect-square overflow-hidden rounded-listing bg-surface-subtle">
        <img
          src={photos[photoIndex]}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {listing.featured && (
          <span className="absolute left-3 top-3 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
            {t('listing.guestFavourite')}
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onToggleSave(listing.id)
          }}
          className="absolute right-3 top-3 rounded-full p-1 transition hover:scale-110"
          aria-label={saved ? t('listing.unsave') : t('listing.save')}
        >
          <IconHeart
            className={`h-6 w-6 ${saved ? 'fill-brand-accent text-brand-accent' : 'fill-black/50 text-white'}`}
            filled={saved}
          />
        </button>

        {onToggleCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onToggleCompare(listing.id)
            }}
            className={`absolute bottom-3 left-3 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${
              compared ? 'bg-ink text-white' : 'bg-white/95 text-ink'
            }`}
          >
            {compared ? t('listing.addedToCompare') : t('listing.compare')}
          </button>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setPhotoIndex((i) => (i === 0 ? photos.length - 1 : i - 1))
              }}
              className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-surface-border bg-surface text-lg opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1))
              }}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-surface-border bg-surface text-lg opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Next photo"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition group-hover:opacity-100">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${i === photoIndex ? 'bg-white' : 'bg-white/60'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-ink">{listing.location || listing.title}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm text-ink">
            <IconStar className="h-3.5 w-3.5" />
            {listing.rating}
          </span>
        </div>
        <p className="truncate text-sm text-ink-secondary">{listing.title}</p>
        <p className="truncate text-sm text-ink-secondary">
          {listing.bedrooms ? `${listing.bedrooms} beds` : listing.type}
          {listing.listingType === 'rent' ? ' · For rent' : listing.listingType === 'sale' ? ' · For sale' : ''}
        </p>
        <p className="pt-1 text-[15px] text-ink">
          <span className="font-semibold">{listing.priceLabel}</span>
        </p>
      </div>
    </Link>
  )
}

export function ListingCardSkeleton({ compact = false }) {
  return (
    <div className={`animate-pulse ${compact ? 'w-[280px] shrink-0' : 'w-full'}`}>
      <div className="aspect-square rounded-listing bg-surface-hover" />
      <div className="mt-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-surface-hover" />
        <div className="h-3 w-1/2 rounded bg-surface-hover" />
        <div className="h-4 w-1/3 rounded bg-surface-hover" />
      </div>
    </div>
  )
}
