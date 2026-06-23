import { Link } from 'react-router-dom'

import { IconHeart, IconStar, IconChevronLeft, IconChevronRight } from './icons'
import { getListingPhotos, useListingPhotoCarousel } from '../hooks/useListingPhotoCarousel'

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

  const photos = getListingPhotos(listing)
  const [photoIndex, setPhotoIndex] = useListingPhotoCarousel(photos)

  const widthClass = compact ? 'w-[min(100%,320px)] shrink-0 sm:w-[300px] lg:w-[320px]' : 'w-full'



  const listingTypeLabel =

    listing.listingType === 'rent'

      ? t('host.listForm.listingTypes.rent')

      : listing.listingType === 'sale'

        ? t('host.listForm.listingTypes.sale')

        : listing.listingType === 'lease'

          ? t('host.listForm.listingTypes.lease')

          : null



  return (

    <Link to={`/property/${listing.id}`} className={`group block ${widthClass}`}>

      <div className="relative aspect-square overflow-hidden rounded-listing bg-white/5">

        {photos.map((src, i) => (
          <img
            key={`${src}-${i}`}
            src={src}
            alt={listing.title}
            loading={i === 0 ? 'lazy' : undefined}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out group-hover:scale-[1.02] ${
              i === photoIndex ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}



        {listing.featured && (

          <span className="absolute left-3 top-3 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">

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

            className={`h-6 w-6 ${saved ? 'fill-brand-accent text-brand-accent' : 'fill-black/40 text-white'}`}

            filled={saved}

          />

        </button>



        {listingTypeLabel && (

          <span className="absolute bottom-3 left-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">

            {listingTypeLabel}

          </span>

        )}



        {onToggleCompare && !compact && (

          <button

            type="button"

            onClick={(e) => {

              e.preventDefault()

              onToggleCompare(listing.id)

            }}

            className={`absolute bottom-3 right-3 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${

              compared ? 'bg-white text-ink' : 'bg-black/40 text-white'

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

              className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white opacity-0 shadow transition group-hover:opacity-100"

              aria-label="Previous photo"

            >

              <IconChevronLeft className="h-4 w-4" />

            </button>

            <button

              type="button"

              onClick={(e) => {

                e.preventDefault()

                setPhotoIndex((i) => (i === photos.length - 1 ? 0 : i + 1))

              }}

              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white opacity-0 shadow transition group-hover:opacity-100"

              aria-label="Next photo"

            >

              <IconChevronRight className="h-4 w-4" />

            </button>

          </>

        )}

      </div>



      <div className="mt-3 space-y-0.5">

        <div className="flex items-start justify-between gap-2">

          <h3 className="truncate font-semibold text-ink">{listing.location || listing.title}</h3>

          <span className="flex shrink-0 items-center gap-1 text-sm text-ink">

            <IconStar className="h-3.5 w-3.5 text-white" />

            {listing.rating}

          </span>

        </div>

        <p className="truncate text-sm text-ink-secondary">{listing.title}</p>

        <p className="truncate text-sm text-ink-secondary">

          {listing.bedrooms ? `${listing.bedrooms} beds` : listing.type}

          {listingTypeLabel ? ` · ${listingTypeLabel}` : ''}

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

    <div className={`animate-pulse ${compact ? 'w-[min(100%,320px)] shrink-0 sm:w-[300px] lg:w-[320px]' : 'w-full'}`}>

      <div className="aspect-square rounded-listing bg-white/10" />

      <div className="mt-3 space-y-2">

        <div className="h-4 w-3/4 rounded bg-white/10" />

        <div className="h-3 w-1/2 rounded bg-white/10" />

        <div className="h-4 w-1/3 rounded bg-white/10" />

      </div>

    </div>

  )

}


