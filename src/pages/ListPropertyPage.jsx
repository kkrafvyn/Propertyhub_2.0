import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { createListing } from '../services/listing-service'
import { uploadListingPhoto } from '../lib/storage'
import { geocodeLocation } from '../services/geo-service'
import { useTranslation } from '../i18n/LocaleContext'

const AMENITY_OPTIONS = [
  'Parking', '24/7 security', 'Backup power', 'Fiber internet',
  'Concierge', 'Garden', 'Pool', 'Elevator', 'Smart locks', 'Solar backup',
]

function ListPropertyForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const steps = [
    t('host.listForm.steps.basics'),
    t('host.listForm.steps.details'),
    t('host.listForm.steps.photos'),
    t('host.listForm.steps.review'),
  ]
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [photos, setPhotos] = useState([])
  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'apartment',
    listingType: 'sale',
    price: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    description: '',
    amenities: [],
  })

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleAmenity(name) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(name)
        ? f.amenities.filter((a) => a !== name)
        : [...f.amenities, name],
    }))
  }

  async function submit() {
    setSubmitting(true)
    setSubmitError('')
    const listingId = `listing-${crypto.randomUUID().slice(0, 8)}`
    try {
      const geo = await geocodeLocation(form.location)
      const uploaded = []
      for (const file of photos) {
        try {
          const { url } = await uploadListingPhoto(listingId, file)
          if (url) uploaded.push(url)
        } catch { /* storage optional */ }
      }
      const payload = {
        ...form,
        id: listingId,
        price: Number(form.price),
        bedrooms: Number(form.bedrooms) || 0,
        bathrooms: Number(form.bathrooms) || 0,
        sqft: Number(form.sqft) || 0,
        price_label: form.listingType === 'rent'
          ? `GHS ${Number(form.price).toLocaleString()} / month`
          : `GHS ${Number(form.price).toLocaleString()}`,
        image: uploaded[0],
        photos: uploaded,
        amenities: form.amenities,
        lat: geo.lat,
        lng: geo.lng,
        status: 'pending_review',
      }
      const result = await createListing(payload)
      if (result.source === 'local') {
        setSubmitError(t('home.sampleListings'))
      }
      navigate('/host/listings', { state: { listed: true, source: result.source } })
    } catch (err) {
      setSubmitError(err.message || t('host.listForm.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">{t('host.title')}</h1>
      <div className="mt-4 flex gap-2">
        {steps.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              i === step ? 'bg-brand-accent text-white' : i < step ? 'bg-surface-hover text-ink' : 'bg-surface-subtle text-ink-secondary'
            }`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-xl space-y-4">
        {step === 0 && (
          <>
            <Field label={t('host.listForm.title')} value={form.title} onChange={(v) => update('title', v)} />
            <Field label={t('host.listForm.location')} value={form.location} onChange={(v) => update('location', v)} />
            <label className="block text-sm">
              <span className="font-medium">{t('host.listForm.propertyType')}</span>
              <select value={form.type} onChange={(e) => update('type', e.target.value)} className="mt-1 w-full rounded-lg border border-surface-border px-4 py-3">
                <option value="apartment">{t('host.listForm.types.apartment')}</option>
                <option value="house">{t('host.listForm.types.house')}</option>
                <option value="office">{t('host.listForm.types.office')}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">{t('host.listForm.listingType')}</span>
              <select value={form.listingType} onChange={(e) => update('listingType', e.target.value)} className="mt-1 w-full rounded-lg border border-surface-border px-4 py-3">
                <option value="sale">{t('host.listForm.listingTypes.sale')}</option>
                <option value="rent">{t('host.listForm.listingTypes.rent')}</option>
                <option value="lease">{t('host.listForm.listingTypes.lease')}</option>
              </select>
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <Field label={t('host.listForm.price')} value={form.price} onChange={(v) => update('price', v)} type="number" />
            <Field label={t('host.listForm.bedrooms')} value={form.bedrooms} onChange={(v) => update('bedrooms', v)} type="number" />
            <Field label={t('host.listForm.bathrooms')} value={form.bathrooms} onChange={(v) => update('bathrooms', v)} type="number" />
            <Field label={t('host.listForm.sqft')} value={form.sqft} onChange={(v) => update('sqft', v)} type="number" />
            <label className="block text-sm">
              <span className="font-medium">{t('host.listForm.description')}</span>
              <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-surface-border px-4 py-3" />
            </label>
            <div>
              <p className="text-sm font-medium">{t('host.listForm.amenities')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAmenity(name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                      form.amenities.includes(name)
                        ? 'bg-brand-accent text-white'
                        : 'border border-surface-border bg-surface-subtle text-ink-secondary'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-sm text-ink-secondary">{t('host.listForm.photosHint')}</p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="mt-2 w-full text-sm"
            />
            {photos.length > 0 && (
              <p className="text-sm text-ink-secondary">{t('host.listForm.photosSelected', { count: photos.length })}</p>
            )}
          </>
        )}

        {step === 3 && (
          <div className="panel-card bg-surface-subtle p-6 text-sm space-y-2">
            <p><strong>{form.title}</strong></p>
            <p>{form.location} · {form.type} · {form.listingType}</p>
            <p>GHS {Number(form.price || 0).toLocaleString()}</p>
            <p>{form.bedrooms} beds · {form.bathrooms} baths · {form.sqft} sqft</p>
            {form.amenities.length > 0 && (
              <p className="text-ink-secondary">{form.amenities.join(' · ')}</p>
            )}
            <p className="text-ink-secondary">{form.description}</p>
          </div>
        )}

        {submitError && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{submitError}</p>
        )}

        <div className="flex gap-3 pt-4">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-semibold">
              {t('host.listForm.back')}
            </button>
          )}
          {step < steps.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
              {t('host.listForm.continue')}
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {submitting ? t('host.listForm.submitting') : t('host.listForm.submit')}
            </button>
          )}
        </div>
      </div>
    </DesktopShell>
  )
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-surface-border px-4 py-3" />
    </label>
  )
}

export default function ListPropertyPage() {
  return <ProtectedRoute><ListPropertyForm /></ProtectedRoute>
}
