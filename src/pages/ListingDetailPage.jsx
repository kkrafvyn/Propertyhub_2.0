import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { IconStar } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchListingById } from '../services/marketplace-service'
import { getAvailability, requestViewing } from '../services/booking-service'

function PhotoGrid({ photos, title, onShowAll }) {
  const { t } = useTranslation()
  const [hero, ...rest] = photos
  const grid = rest.length >= 4 ? rest.slice(0, 4) : [...rest, ...photos].slice(0, 4)

  return (
    <div className="grid h-[480px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-xl">
      <button type="button" onClick={onShowAll} className="col-span-2 row-span-2 block h-full w-full">
        <img src={hero} alt={title} className="h-full w-full object-cover" />
      </button>
      {grid.map((src, index) => (
        <button key={src} type="button" onClick={onShowAll} className="relative h-full w-full overflow-hidden">
          <img src={src} alt="" className="h-full w-full object-cover" />
          {index === 3 && photos.length > 5 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
              {t('property.showAllPhotos')}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function PhotoModal({ photos, title, onClose }) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute end-4 top-4 rounded-full bg-surface-subtle px-3 py-1 text-sm font-semibold">
          {t('common.close')}
        </button>
        <h2 className="mb-4 pe-16 text-lg font-semibold">{title}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {photos.map((src) => (
            <img key={src} src={src} alt="" className="w-full rounded-lg object-cover" />
          ))}
        </div>
      </div>
    </div>
  )
}

function BookingCard({ listing }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [date, setDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [slots, setSlots] = useState([])
  const [guests, setGuests] = useState(1)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    getAvailability(listing.id).then(({ slots: rows }) => {
      setSlots(rows ?? [])
      if (rows?.length) setSelectedSlot(rows[0].id)
    })
  }, [listing.id])

  async function handleRequest() {
    if (!user) {
      navigate('/login', { state: { from: `/property/${listing.id}` } })
      return
    }

    const slot = slots.find((s) => s.id === selectedSlot)
    const viewingDate = slot?.date || date
    if (!viewingDate) {
      setMessage(t('property.pickDate'))
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      await requestViewing({
        listingId: listing.id,
        date: viewingDate,
        guests,
        slotId: slot?.id,
        notes: slot?.time ? t('property.preferredTime', { time: slot.time }) : '',
        listingTitle: listing.title,
        hostName: listing.host,
      })
      setStatus('success')
      setMessage(t('property.requestSent'))
    } catch (err) {
      setStatus('error')
      setMessage(err.message || t('property.requestFailed'))
    }
  }

  return (
    <div className="sticky top-28 rounded-xl border border-surface-border bg-surface p-6 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-ink">{listing.priceLabel}</p>
        <span className="flex items-center gap-1 text-sm">
          <IconStar className="h-3.5 w-3.5" />
          <span className="font-semibold">{listing.rating}</span>
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-surface-border">
        {slots.length > 0 ? (
          <div className="p-3">
            <label htmlFor="viewing-slot" className="text-[10px] font-bold uppercase tracking-wide text-ink">
              {t('property.availableSlots')}
            </label>
            <select
              id="viewing-slot"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-2 py-2 text-sm outline-none"
            >
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {t('property.slotsLeft', { date: slot.date, time: slot.time, count: slot.available })}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2">
            <div className="border-e border-surface-border p-3">
              <label htmlFor="viewing-date" className="text-[10px] font-bold uppercase tracking-wide text-ink">
                {t('property.viewing')}
              </label>
              <input
                id="viewing-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full bg-transparent text-sm text-ink outline-none"
              />
            </div>
            <div className="p-3">
              <label htmlFor="viewing-guests" className="text-[10px] font-bold uppercase tracking-wide text-ink">
                {t('property.guests')}
              </label>
              <input
                id="viewing-guests"
                type="number"
                min={1}
                max={10}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-1 w-full bg-transparent text-sm text-ink outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {slots.length > 0 && (
        <div className="mt-3">
          <label htmlFor="viewing-guests-slots" className="text-[10px] font-bold uppercase tracking-wide text-ink-secondary">
            {t('property.guests')}
          </label>
          <input
            id="viewing-guests-slots"
            type="number"
            min={1}
            max={10}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none"
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleRequest}
        disabled={status === 'loading' || status === 'success'}
        className="mt-4 w-full rounded-lg bg-brand-accent py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {status === 'loading'
          ? t('property.sending')
          : status === 'success'
            ? t('property.requestSentBtn')
            : t('listing.requestViewing')}
      </button>

      <p className="mt-3 text-center text-sm text-ink-secondary">
        {message || t('common.notChargedYet')}
      </p>
    </div>
  )
}

export default function ListingDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [galleryOpen, setGalleryOpen] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)

    fetchListingById(id).then(({ listing: row }) => {
      if (!ignore) {
        setListing(row)
        setLoading(false)
      }
    })

    return () => { ignore = true }
  }, [id])

  if (loading) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-2/3 rounded bg-surface-hover" />
          <div className="h-[480px] rounded-xl bg-surface-hover" />
        </div>
      </DesktopShell>
    )
  }

  if (!listing) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-semibold">{t('property.notFound')}</h1>
          <Link to="/" className="mt-4 inline-block font-medium text-ink underline">
            {t('property.backToHomes')}
          </Link>
        </div>
      </DesktopShell>
    )
  }

  const docKeys = ['docTitle', 'docLicense', 'docDisclosure']
  const metaParts = [
    listing.bedrooms ? t('property.bedrooms', { count: listing.bedrooms }) : listing.type,
    listing.bathrooms ? t('property.baths', { count: listing.bathrooms }) : null,
    listing.sqft ? t('property.sqft', { count: listing.sqft.toLocaleString() }) : null,
  ].filter(Boolean)

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold leading-tight text-ink">{listing.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1 font-semibold">
            <IconStar className="h-3.5 w-3.5" />
            {listing.rating}
          </span>
          <span className="text-ink-secondary">·</span>
          <span className="font-semibold underline">{listing.location}</span>
          {listing.verified && (
            <>
              <span className="text-ink-secondary">·</span>
              <span className="rounded-md bg-surface-hover px-2 py-0.5 text-xs font-semibold text-ink">
                {t('categories.verified')}
              </span>
            </>
          )}
        </div>
      </div>

      <PhotoGrid photos={listing.photos} title={listing.title} onShowAll={() => setGalleryOpen(true)} />
      {galleryOpen && (
        <PhotoModal photos={listing.photos} title={listing.title} onClose={() => setGalleryOpen(false)} />
      )}

      <div className="mt-12 grid gap-16 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section className="border-b border-surface-border pb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{t('property.hostedBy', { host: listing.host })}</h2>
                <p className="mt-1 text-ink-secondary">{metaParts.join(' · ')}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-lg font-semibold text-white">
                {listing.host.charAt(0)}
              </div>
            </div>
          </section>

          <section className="border-b border-surface-border pb-8">
            <p className="leading-relaxed text-ink">{listing.description}</p>
          </section>

          <section>
            <h2 className="mb-6 text-xl font-semibold">{t('listing.whatOffers')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {listing.amenities.map((item) => (
                <div key={item} className="flex items-center gap-3 text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="border-t border-surface-border pt-8">
            <h2 className="mb-4 text-xl font-semibold">{t('property.virtualTour')}</h2>
            <div className="overflow-hidden panel-card bg-surface-subtle">
              <div className="flex aspect-video items-center justify-center bg-surface-subtle">
                <p className="text-sm text-ink-secondary">{t('property.virtualTourHint')}</p>
              </div>
              <p className="p-4 text-sm text-ink-secondary">{t('property.virtualTourDesc')}</p>
            </div>
          </section>

          <section className="border-t border-surface-border pt-8">
            <h2 className="mb-4 text-xl font-semibold">{t('property.documents')}</h2>
            <ul className="space-y-2 text-sm">
              {docKeys.map((key) => (
                <li key={key} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-4 py-3">
                  <span>{t(`property.${key}`)}</span>
                  <span className="text-xs font-semibold text-ink">
                    {listing.verified ? t('common.verified') : t('common.pending')}
                  </span>
                </li>
              ))}
            </ul>
            <Link to="/documents" className="mt-3 inline-block text-sm font-semibold text-ink underline">
              {t('property.openVault')}
            </Link>
          </section>
        </div>

        <BookingCard listing={listing} />
      </div>
    </DesktopShell>
  )
}
