import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { MobilePrimaryButton } from '../../components/ui/MobileUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { createListing } from '../../services/listing-service'
import { uploadListingPhoto } from '../../lib/storage'
import { geocodeLocation } from '../../services/geo-service'
import { trackFunnel } from '../../lib/analytics'

function HostForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [photos, setPhotos] = useState([])
  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'apartment',
    listingType: 'rent',
    price: '',
    bedrooms: '',
    description: '',
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit() {
    setSubmitting(true)
    setError('')
    const listingId = `listing-${crypto.randomUUID().slice(0, 8)}`
    try {
      const geo = await geocodeLocation(form.location)
      const uploaded = []
      for (const file of photos) {
        try {
          const { url } = await uploadListingPhoto(listingId, file)
          if (url) uploaded.push(url)
        } catch { /* optional */ }
      }
      const price = Number(form.price)
      await createListing({
        ...form,
        id: listingId,
        price,
        bedrooms: Number(form.bedrooms) || 0,
        price_label: form.listingType === 'rent'
          ? `GHS ${price.toLocaleString()} / month`
          : `GHS ${price.toLocaleString()}`,
        image: uploaded[0],
        photos: uploaded,
        lat: geo.lat,
        lng: geo.lng,
        status: 'pending_review',
      })
      trackFunnel('listing_submitted', { listing_id: listingId, type: form.type })
      navigate('/profile', { state: { listed: true } })
    } catch (err) {
      setError(err.message || t('host.listForm.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('host.title')} backTo="/profile" />
      <div className="space-y-4 px-4 pb-8">
        {step === 0 && (
          <>
            <label className="block text-sm font-semibold">
              {t('host.listForm.title')}
              <input
                required
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm font-semibold">
              {t('host.listForm.location')}
              <input
                required
                value={form.location}
                onChange={(e) => update('location', e.target.value)}
                className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm font-semibold">
              {t('host.listForm.propertyType')}
              <select value={form.type} onChange={(e) => update('type', e.target.value)} className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm">
                <option value="apartment">{t('host.listForm.types.apartment')}</option>
                <option value="house">{t('host.listForm.types.house')}</option>
                <option value="office">{t('host.listForm.types.office')}</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              {t('host.listForm.listingType')}
              <select value={form.listingType} onChange={(e) => update('listingType', e.target.value)} className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm">
                <option value="sale">{t('host.listForm.listingTypes.sale')}</option>
                <option value="rent">{t('host.listForm.listingTypes.rent')}</option>
              </select>
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <label className="block text-sm font-semibold">
              {t('host.listForm.price')}
              <input type="number" required value={form.price} onChange={(e) => update('price', e.target.value)} className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm font-semibold">
              {t('host.listForm.bedrooms')}
              <input type="number" value={form.bedrooms} onChange={(e) => update('bedrooms', e.target.value)} className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm font-semibold">
              {t('host.listForm.description')}
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-surface-border px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm font-semibold">
              Photos
              <input type="file" accept="image/*" multiple capture="environment" onChange={(e) => setPhotos([...e.target.files])} className="mt-1 block w-full text-sm" />
            </label>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="flex-1 rounded-xl border border-surface-border py-3 text-sm font-semibold">
              {t('host.listForm.back')}
            </button>
          )}
          {step < 1 ? (
            <MobilePrimaryButton type="button" onClick={() => setStep(1)} className="flex-1">
              {t('host.listForm.continue')}
            </MobilePrimaryButton>
          ) : (
            <MobilePrimaryButton type="button" disabled={submitting} onClick={submit} className="flex-1">
              {submitting ? t('host.listForm.submitting') : t('host.listForm.submit')}
            </MobilePrimaryButton>
          )}
        </div>
        <p className="text-center text-xs text-ink-secondary">{t('mobile.hostModerationNote')}</p>
      </div>
    </MobileShell>
  )
}

export default function MobileHostListingPage() {
  return (
    <ProtectedRoute>
      <HostForm />
    </ProtectedRoute>
  )
}
