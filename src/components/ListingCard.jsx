import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconHeart, IconStar } from './icons'

export default function ListingCard({ listing, saved, compared, onToggleSave, onToggleCompare }) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const photos = listing.photos?.length ? listing.photos : [listing.image]

  return (
    <Link to={`/property/${listing.id}`} className="group block">
      <div className="relative aspect-[20/19] overflow-hidden rounded-card bg-surface-subtle">
        <img
          src={photos[photoIndex]}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />

        {listing.featured && (
          <span className="absolute left-3 top-3 rounded-md bg-brand px-2 py-1 text-xs font-semibold text-brand-dark shadow-sm">
            Top pick
          </span>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onToggleSave(listing.id)
          }}
          className="absolute right-3 top-3 rounded-full p-1.5 transition hover:scale-110"
          aria-label={saved ? 'Remove from saved' : 'Save listing'}
        >
          <IconHeart
            className={`h-5 w-5 drop-shadow ${saved ? 'text-brand' : 'text-white'}`}
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
            className={`absolute left-3 top-12 rounded-full px-2 py-0.5 text-[10px] font-bold shadow ${
              compared ? 'bg-brand-dark text-brand' : 'bg-white/90 text-brand-dark'
            }`}
          >
            {compared ? '✓ Compare' : 'Compare'}
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
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100"
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
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-ink">{listing.title}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm">
            <IconStar className="text-brand-dark" />
            {listing.rating}
          </span>
        </div>
        <p className="truncate text-sm text-ink-secondary">{listing.location}</p>
        <p className="text-sm text-ink-secondary">
          {listing.bedrooms ? `${listing.bedrooms} beds` : listing.type}
          {listing.listingType === 'rent' ? ' · For rent' : listing.listingType === 'sale' ? ' · For sale' : ' · For lease'}
        </p>
        <p className="pt-1 text-[15px]">
          <span className="font-semibold text-ink">{listing.priceLabel}</span>
        </p>
      </div>
    </Link>
  )
}
