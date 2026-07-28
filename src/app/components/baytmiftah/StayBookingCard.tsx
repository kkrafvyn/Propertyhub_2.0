import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { createReservation, fetchListingAvailability } from '../../lib/baytmiftah/reservation-service'
import { payReservation } from '../../lib/baytmiftah/payments-service'
import { getDefaultProvider } from '../../lib/baytmiftah/payment-providers'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'

export default function StayBookingCard({ listing }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [guests, setGuests] = useState(1)
  const [availability, setAvailability] = useState([])
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchListingAvailability(listing.id).then(({ availability: rows }) => setAvailability(rows ?? []))
  }, [listing.id])

  const nightlyRate = Number(listing.price) || 0
  const nights = checkIn && checkOut
    ? Math.max(1, Math.ceil((Number(new Date(checkOut)) - Number(new Date(checkIn))) / (1000 * 60 * 60 * 24)))
    : 0
  const total = nights * nightlyRate
  const blockedDates = new Set(
    availability.filter((row) => row.is_available === false).map((row) => row.available_date)
  )

  const hasBlockedSelection = () => {
    if (!checkIn || !checkOut) return false
    const start = new Date(checkIn)
    const end = new Date(checkOut)
    for (let cursor = new Date(start); cursor < end; cursor.setDate(cursor.getDate() + 1)) {
      const key = cursor.toISOString().slice(0, 10)
      if (blockedDates.has(key)) return true
    }
    return false
  }

  async function handleBook() {
    if (!user) {
      navigate('/login', { state: { from: `/property/${listing.id}` } })
      return
    }
    if (!checkIn || !checkOut || nights < 1) {
      setMessage('Select check-in and check-out dates.')
      return
    }
    if (hasBlockedSelection()) {
      setMessage('Some selected dates are unavailable.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const result = await createReservation({
        listingId: listing.id,
        checkIn,
        checkOut,
        guests,
        total,
      })
      if (!result?.ok && !result?.reservation) {
        throw new Error((result as { error?: string })?.error || 'Could not create reservation')
      }
      const reservationId = result.reservation?.id ?? result.id
      const pay = await payReservation({
        reservationId,
        amount: total,
        listingId: listing.id,
        provider: getDefaultProvider(),
      })
      if (pay.checkout_url) {
        window.location.href = pay.checkout_url
        return
      }
      setStatus('success')
      setMessage('Reservation created. Complete payment from your trips.')
      navigate(CONSUMER_ROUTES.trips)
    } catch (err) {
      setStatus('error')
      setMessage(err.message || 'Booking failed')
    }
  }

  return (
    <div className="sticky top-28 rounded-xl border border-surface-border bg-surface p-6 shadow-card">
      <p className="text-2xl font-semibold text-ink">{listing.priceLabel}</p>
      <p className="text-sm text-ink-secondary">Short stay · {listing.instantBook ? 'Instant book' : 'Request to book'}</p>

      <div className="mt-4 grid grid-cols-2 gap-2 overflow-hidden rounded-lg border border-surface-border">
        <div className="border-e border-surface-border p-3">
          <label htmlFor="stay-checkin" className="text-[10px] font-bold uppercase tracking-wide text-ink">Check-in</label>
          <input
            id="stay-checkin"
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="p-3">
          <label htmlFor="stay-checkout" className="text-[10px] font-bold uppercase tracking-wide text-ink">Check-out</label>
          <input
            id="stay-checkout"
            type="date"
            value={checkOut}
            min={checkIn}
            onChange={(e) => setCheckOut(e.target.value)}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="stay-guests" className="text-[10px] font-bold uppercase tracking-wide text-ink-secondary">Guests</label>
        <input
          id="stay-guests"
          type="number"
          min={1}
          max={12}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm outline-none"
        />
      </div>

      {nights > 0 && (
        <p className="mt-3 text-sm text-ink-secondary">
          {nights} night{nights > 1 ? 's' : ''} · GHS {total.toLocaleString()} total
        </p>
      )}

      {availability.length > 0 && (
        <p className="mt-2 text-xs text-ink-secondary">{availability.length} dates available this month</p>
      )}

      <button
        type="button"
        onClick={handleBook}
        disabled={status === 'loading' || status === 'success'}
        className="mt-4 w-full rounded-lg bg-brand-accent py-3.5 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {status === 'loading' ? 'Booking…' : status === 'success' ? 'Booked' : 'Book stay'}
      </button>

      <p className="mt-3 text-center text-sm text-ink-secondary">{message || t('common.notChargedYet')}</p>
    </div>
  )
}
