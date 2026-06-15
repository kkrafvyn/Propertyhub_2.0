import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { getAvailability, requestViewing } from '../../services/booking-service'
import { MobilePrimaryButton } from '../ui/MobileUI'

export default function MobileViewingModal({ listing, onClose, onBooked }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [date, setDate] = useState('')
  const [guests, setGuests] = useState(1)
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState([])
  const [slotId, setSlotId] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!listing?.id) return
    getAvailability(listing.id).then(({ slots: rows }) => setSlots(rows || []))
  }, [listing?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!date) return
    setLoading(true)
    setMessage('')
    const result = await requestViewing({
      listingId: listing.id,
      date,
      guests,
      notes,
      slotId: slotId || null,
      listingTitle: listing.title,
      hostName: listing.host,
    })
    setLoading(false)
    if (result?.ok !== false) {
      onBooked?.(result)
      onClose()
      return
    }
    setMessage(result.message || t('mobile.viewingError'))
  }

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-card sm:rounded-2xl">
          <h3 className="text-lg font-bold text-ink">{t('listing.requestViewing')}</h3>
          <p className="mt-2 text-sm text-ink-secondary">{t('mobile.viewingSignIn')}</p>
          <MobilePrimaryButton as={Link} to="/login" className="mt-4 block w-full text-center">
            {t('auth.logIn')}
          </MobilePrimaryButton>
          <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm font-semibold text-ink-secondary">
            {t('common.close')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-card sm:rounded-2xl">
        <h3 className="text-lg font-bold text-ink">{t('listing.requestViewing')}</h3>
        <p className="mt-1 truncate text-sm text-ink-secondary">{listing.title}</p>

        <label className="mt-4 block text-sm font-semibold text-ink">
          {t('mobile.viewingDate')}
          <input
            required
            type="date"
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
          />
        </label>

        {slots.length > 0 && (
          <label className="mt-3 block text-sm font-semibold text-ink">
            {t('mobile.viewingSlot')}
            <select
              value={slotId}
              onChange={(e) => setSlotId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
            >
              <option value="">{t('mobile.viewingAnyTime')}</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.date} {s.time || s.label || ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="mt-3 block text-sm font-semibold text-ink">
          {t('mobile.viewingGuests')}
          <input
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
          />
        </label>

        <label className="mt-3 block text-sm font-semibold text-ink">
          {t('mobile.viewingNotes')}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder={t('mobile.viewingNotesPlaceholder')}
            className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
          />
        </label>

        {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

        <MobilePrimaryButton type="submit" disabled={loading} className="mt-4 w-full">
          {loading ? t('mobile.viewingSending') : t('listing.requestViewing')}
        </MobilePrimaryButton>
        <button type="button" onClick={onClose} className="mt-3 w-full py-2 text-sm font-semibold text-ink-secondary">
          {t('common.close')}
        </button>
      </form>
    </div>
  )
}
