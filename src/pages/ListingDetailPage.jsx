import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { IconStar } from '../components/icons'
import { useAuth } from '../context/AuthContext'
import { fetchListingById } from '../services/marketplace-service'
import { getAvailability, requestViewing } from '../services/booking-service'

function PhotoGrid({ photos, title, onShowAll }) {
  const [hero, ...rest] = photos
  const grid = rest.length >= 4 ? rest.slice(0, 4) : [...rest, ...photos].slice(0, 4)

  return (
    <div className="grid h-[480px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-card">
      <button type="button" onClick={onShowAll} className="col-span-2 row-span-2 block h-full w-full">
        <img src={hero} alt={title} className="h-full w-full object-cover" />
      </button>
      {grid.map((src, index) => (
        <button key={src} type="button" onClick={onShowAll} className="relative h-full w-full overflow-hidden">
          <img src={src} alt="" className="h-full w-full object-cover" />
          {index === 3 && photos.length > 5 && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-dark/50 text-sm font-semibold text-white">
              Show all photos
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

function PhotoModal({ photos, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/90 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-card bg-surface p-4" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-surface-subtle px-3 py-1 text-sm font-semibold">Close</button>
        <h2 className="mb-4 pr-16 text-lg font-semibold">{title}</h2>
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
      setMessage('Please pick a viewing date or time slot.')
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
        notes: slot?.time ? `Preferred time: ${slot.time}` : '',
      })
      setStatus('success')
      setMessage('Viewing request sent! Check Trips for updates.')
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Could not send request. Try again.')
    }
  }

  return (
    <div className="sticky top-28 rounded-card border border-surface-border bg-surface p-6 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-ink">{listing.priceLabel}</p>
        <span className="flex items-center gap-1 text-sm">
          <IconStar className="text-brand-dark" />
          <span className="font-semibold">{listing.rating}</span>
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-surface-border">
        {slots.length > 0 ? (
          <div className="p-3">
            <label htmlFor="viewing-slot" className="text-[10px] font-bold uppercase tracking-wide text-ink">
              Available slots
            </label>
            <select
              id="viewing-slot"
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border bg-transparent px-2 py-2 text-sm outline-none"
            >
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.date} · {slot.time} ({slot.available} left)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-2">
            <div className="border-r border-surface-border p-3">
              <label htmlFor="viewing-date" className="text-[10px] font-bold uppercase tracking-wide text-ink">
                Viewing
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
                Guests
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
            Guests
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
        className="mt-4 w-full rounded-lg bg-brand-dark py-3.5 text-base font-semibold text-brand transition hover:bg-ink disabled:opacity-60"
      >
        {status === 'loading' ? 'Sending…' : status === 'success' ? 'Request sent' : 'Request viewing'}
      </button>

      <p className="mt-3 text-center text-sm text-ink-secondary">
        {message || "You won't be charged yet"}
      </p>
    </div>
  )
}

export default function ListingDetailPage() {
  const { id } = useParams()
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
          <div className="h-[480px] rounded-card bg-surface-hover" />
        </div>
      </DesktopShell>
    )
  }

  if (!listing) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <div className="py-20 text-center">
          <h1 className="text-2xl font-semibold">Property not found</h1>
          <Link to="/" className="mt-4 inline-block font-medium text-brand-dark underline">
            Back to homes
          </Link>
        </div>
      </DesktopShell>
    )
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold leading-tight text-ink">{listing.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1 font-semibold">
            <IconStar className="text-brand-dark" />
            {listing.rating}
          </span>
          <span className="text-ink-secondary">·</span>
          <span className="font-semibold underline">{listing.location}</span>
          {listing.verified && (
            <>
              <span className="text-ink-secondary">·</span>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-dark">
                Verified
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
                <h2 className="text-xl font-semibold">Hosted by {listing.host}</h2>
                <p className="mt-1 text-ink-secondary">
                  {listing.bedrooms ? `${listing.bedrooms} bedrooms` : listing.type}
                  {listing.bathrooms ? ` · ${listing.bathrooms} baths` : ''}
                  {listing.sqft ? ` · ${listing.sqft.toLocaleString()} sqft` : ''}
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-dark text-lg font-semibold text-brand">
                {listing.host.charAt(0)}
              </div>
            </div>
          </section>

          <section className="border-b border-surface-border pb-8">
            <p className="leading-relaxed text-ink">{listing.description}</p>
          </section>

          <section>
            <h2 className="mb-6 text-xl font-semibold">What this place offers</h2>
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
            <h2 className="mb-4 text-xl font-semibold">Virtual tour</h2>
            <div className="overflow-hidden rounded-card border border-surface-border bg-surface-subtle">
              <div className="flex aspect-video items-center justify-center bg-brand-dark/5">
                <p className="text-sm text-ink-secondary">360° walkthrough available after viewing request</p>
              </div>
              <p className="p-4 text-sm text-ink-secondary">
                Request a viewing to unlock the full virtual tour and floor plan for this property.
              </p>
            </div>
          </section>

          <section className="border-t border-surface-border pt-8">
            <h2 className="mb-4 text-xl font-semibold">Documents</h2>
            <ul className="space-y-2 text-sm">
              {['Title verification summary', 'Agency license', 'Property disclosure'].map((doc) => (
                <li key={doc} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface px-4 py-3">
                  <span>{doc}</span>
                  <span className="text-xs font-semibold text-brand-dark">{listing.verified ? 'Verified' : 'Pending'}</span>
                </li>
              ))}
            </ul>
            <Link to="/documents" className="mt-3 inline-block text-sm font-semibold text-brand-dark underline">
              Open document vault →
            </Link>
          </section>
        </div>

        <BookingCard listing={listing} />
      </div>
    </DesktopShell>
  )
}
