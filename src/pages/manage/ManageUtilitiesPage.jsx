import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { UTILITY_TYPES, utilityTypeLabel, billingModelLabel } from '../../lib/utilities'
import {
  fetchUtilityProviders,
  fetchPropertyUtilities,
  savePropertyUtilityConfig,
  generateMonthlyBills,
  recordMeterReading,
} from '../../services/utility-service'

const DEMO_PROPERTY = 'east-legon-family-home'

function ManageUtilities() {
  const [propertyId, setPropertyId] = useState(DEMO_PROPERTY)
  const [providers, setProviders] = useState([])
  const [utilities, setUtilities] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [readingForm, setReadingForm] = useState({ account_id: '', utility_type: 'electricity', previous_reading: 0, current_reading: '' })

  useEffect(() => {
    fetchUtilityProviders().then(({ providers: rows }) => setProviders(rows ?? []))
  }, [])

  useEffect(() => {
    fetchPropertyUtilities(propertyId).then(({ utilities: rows }) => setUtilities(rows ?? []))
  }, [propertyId])

  async function handleGenerateBills() {
    setLoading(true)
    setMessage('')
    try {
      const result = await generateMonthlyBills()
      setMessage(`Generated ${result.count ?? 0} utility bill(s) for active accounts.`)
    } catch (err) {
      setMessage(err.message || 'Bill generation failed.')
    }
    setLoading(false)
  }

  async function handleRecordReading(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await recordMeterReading({
        utility_account_id: readingForm.account_id || 'ua-demo-001',
        utility_type: readingForm.utility_type,
        previous_reading: Number(readingForm.previous_reading),
        current_reading: Number(readingForm.current_reading),
        recorded_by: 'landlord',
      })
      setMessage('Meter reading recorded.')
      setReadingForm((f) => ({ ...f, current_reading: '' }))
    } catch (err) {
      setMessage(err.message || 'Could not record reading.')
    }
    setLoading(false)
  }

  async function toggleUtility(util) {
    const next = !util.enabled
    await savePropertyUtilityConfig({ ...util, enabled: next })
    setUtilities((rows) => rows.map((u) => (u.id === util.id ? { ...u, enabled: next } : u)))
    setMessage(`${utilityTypeLabel(util.utility_type)} ${next ? 'enabled' : 'disabled'}.`)
  }

  return (
    <ManageShell titleKey="hubs.manage.utilities.title" subtitleKey="hubs.manage.utilities.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-sm font-semibold">Property ID</span>
          <input
            type="text"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="mt-1 block w-64 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleGenerateBills}
          disabled={loading}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Run monthly billing
        </button>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Configured utilities</h2>
        <div className="space-y-3">
          {utilities.map((u) => (
            <article key={u.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
              <div>
                <p className="font-semibold">{utilityTypeLabel(u.utility_type)}</p>
                <p className="text-sm text-ink-secondary">
                  {u.provider_name} · {billingModelLabel(u.billing_model)}
                  {u.billing_model === 'metered' ? ` · GHS ${u.rate_per_unit}/unit` : ` · GHS ${u.fixed_monthly_fee}/mo`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleUtility(u)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${u.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'border border-surface-border'}`}
              >
                {u.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </article>
          ))}
          {utilities.length === 0 && (
            <p className="text-sm text-ink-secondary">No utilities configured for this property.</p>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Available providers (Ghana)</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.map((p) => (
            <div key={p.id} className="rounded-lg border border-surface-border bg-surface-subtle px-3 py-2 text-sm">
              <span className="font-semibold">{p.provider_name}</span>
              <span className="text-ink-secondary"> · {utilityTypeLabel(p.utility_type)} · {billingModelLabel(p.billing_model)}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Record meter reading</h2>
        <form onSubmit={handleRecordReading} className="grid max-w-lg gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold">Utility account ID</span>
            <input
              type="text"
              value={readingForm.account_id}
              onChange={(e) => setReadingForm((f) => ({ ...f, account_id: e.target.value }))}
              placeholder="ua-…"
              className="mt-1 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Type</span>
            <select
              value={readingForm.utility_type}
              onChange={(e) => setReadingForm((f) => ({ ...f, utility_type: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
            >
              {UTILITY_TYPES.map((t) => (
                <option key={t} value={t}>{utilityTypeLabel(t)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Previous reading</span>
            <input
              type="number"
              value={readingForm.previous_reading}
              onChange={(e) => setReadingForm((f) => ({ ...f, previous_reading: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Current reading</span>
            <input
              type="number"
              required
              value={readingForm.current_reading}
              onChange={(e) => setReadingForm((f) => ({ ...f, current_reading: e.target.value }))}
              className="mt-1 block w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            Save reading
          </button>
        </form>
      </section>
    </ManageShell>
  )
}

export default function ManageUtilitiesPage() {
  return <ProtectedRoute><ManageUtilities /></ProtectedRoute>
}
