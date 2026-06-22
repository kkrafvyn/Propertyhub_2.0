import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import ProtectedRoute from '../../components/ProtectedRoute'
import ResponsivePageShell from '../../components/ResponsivePageShell'
import { Badge, PageTitle, PrimaryButton, TextLink } from '../../components/ui/AirbnbUI'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { useIsMobileViewport } from '../../hooks/useMediaQuery'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchListingById } from '../../services/marketplace-service'
import {
  createViewingSlot,
  deleteViewingSlot,
  fetchListingSlotsForManage,
} from '../../services/booking-service'

function slotTone(type) {
  return type === 'open_house' ? 'accent' : 'neutral'
}

export function ViewingSchedulePanel({ listingId, backTo, backLabel }) {
  const { t } = useTranslation()
  const mobile = useIsMobileViewport()
  const [listing, setListing] = useState(null)
  const [slots, setSlots] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    slot_date: '',
    slot_time: '10:00',
    slot_type: 'viewing',
    capacity: '2',
    notes: '',
  })

  function reload() {
    fetchListingSlotsForManage(listingId).then(({ slots: rows }) => setSlots(rows ?? []))
  }

  useEffect(() => {
    fetchListingById(listingId).then(({ listing: row }) => setListing(row))
    reload()
  }, [listingId])

  async function handleAdd(e) {
    e?.preventDefault?.()
    setLoading(true)
    await createViewingSlot({
      listingId,
      slotDate: form.slot_date,
      slotTime: form.slot_time,
      slotType: form.slot_type,
      capacity: Number(form.capacity),
      notes: form.notes || null,
    })
    setShowForm(false)
    setForm({ slot_date: '', slot_time: '10:00', slot_type: 'viewing', capacity: '2', notes: '' })
    setLoading(false)
    reload()
  }

  async function handleDelete(slotId) {
    await deleteViewingSlot(slotId)
    reload()
  }

  const resolvedBack = backTo || '/host/listings'

  return (
    <ResponsivePageShell
      backTo={resolvedBack}
      titleKey="viewingSchedule.title"
      hideNav
    >
      {!mobile && backTo && (
        <TextLink to={resolvedBack} className="mb-4 inline-block">{backLabel || t('viewingSchedule.back')}</TextLink>
      )}
      {mobile && (
        <PrimaryButton type="button" onClick={() => setShowForm(true)} className="mb-4 w-full">
          {t('viewingSchedule.addSlot')}
        </PrimaryButton>
      )}
      {!mobile && (
        <PageTitle
          title={t('viewingSchedule.title')}
          action={
            <PrimaryButton type="button" onClick={() => setShowForm(true)}>
              {t('viewingSchedule.addSlot')}
            </PrimaryButton>
          }
        />
      )}

      <p className="mb-6 text-sm text-ink-secondary">{t('viewingSchedule.hint')}</p>

      <div className="space-y-3">
        {slots.length === 0 && (
          <p className="rounded-xl border border-dashed border-surface-border px-4 py-8 text-center text-sm text-ink-secondary">
            {t('viewingSchedule.empty')}
          </p>
        )}
        {slots.map((slot) => (
          <article key={slot.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{slot.date} · {slot.time}</p>
                <Badge tone={slotTone(slot.slot_type)}>
                  {slot.slot_type === 'open_house' ? t('viewingSchedule.openHouse') : t('viewingSchedule.privateViewing')}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-ink-secondary">
                {t('viewingSchedule.capacity', { booked: slot.booked ?? 0, capacity: slot.capacity ?? 1 })}
              </p>
              {slot.notes && <p className="mt-1 text-sm text-ink-secondary">{slot.notes}</p>}
            </div>
            <button
              type="button"
              disabled={(slot.booked ?? 0) > 0}
              onClick={() => handleDelete(slot.id)}
              className="text-sm font-semibold text-red-600 disabled:opacity-40"
            >
              {t('viewingSchedule.remove')}
            </button>
          </article>
        ))}
      </div>

      {listing?.status === 'active' && (
        <Link to={`/property/${listing.id}`} className="mt-6 inline-block text-sm font-semibold text-brand-accent underline">
          {t('viewingSchedule.previewListing')}
        </Link>
      )}

      {showForm && (
        <QuickFormModal
          title={t('viewingSchedule.addSlot')}
          onClose={() => setShowForm(false)}
          onSubmit={handleAdd}
          submitLabel={t('viewingSchedule.publish')}
          loading={loading}
        >
          <ModalField label={t('viewingSchedule.date')}>
            <input
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              className={modalInputClassName()}
              value={form.slot_date}
              onChange={(e) => setForm((f) => ({ ...f, slot_date: e.target.value }))}
            />
          </ModalField>
          <ModalField label={t('viewingSchedule.time')}>
            <input
              required
              type="time"
              className={modalInputClassName()}
              value={form.slot_time}
              onChange={(e) => setForm((f) => ({ ...f, slot_time: e.target.value }))}
            />
          </ModalField>
          <ModalField label={t('viewingSchedule.type')}>
            <select
              className={modalInputClassName()}
              value={form.slot_type}
              onChange={(e) => setForm((f) => ({
                ...f,
                slot_type: e.target.value,
                capacity: e.target.value === 'open_house' ? '20' : '2',
              }))}
            >
              <option value="viewing">{t('viewingSchedule.privateViewing')}</option>
              <option value="open_house">{t('viewingSchedule.openHouse')}</option>
            </select>
          </ModalField>
          <ModalField label={t('viewingSchedule.maxGuests')}>
            <input
              type="number"
              min={1}
              max={100}
              className={modalInputClassName()}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            />
          </ModalField>
          <ModalField label={t('viewingSchedule.notes')}>
            <input
              className={modalInputClassName()}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder={t('viewingSchedule.notesPlaceholder')}
            />
          </ModalField>
        </QuickFormModal>
      )}
    </ResponsivePageShell>
  )
}

export default function ListingViewingSchedulePage({ backTo: backToProp, backLabel }) {
  const { listingId } = useParams()
  const location = useLocation()
  const backTo = backToProp ?? location.state?.backTo ?? '/host/listings'
  return (
    <ProtectedRoute>
      <ViewingSchedulePanel listingId={listingId} backTo={backTo} backLabel={backLabel} />
    </ProtectedRoute>
  )
}
