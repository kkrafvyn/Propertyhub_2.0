import { useEffect, useState } from 'react'
import ResponsivePageShell from '../../components/ResponsivePageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { Field, inputClass } from '../../components/ui/AirbnbUI'
import { fetchRentalApplications, submitRentalApplication } from '../../services/rental-application-service'

function RentalApplicationContent() {
  const [applications, setApplications] = useState([])
  const [listingId, setListingId] = useState('')
  const [property, setProperty] = useState('')
  const [moveInDate, setMoveInDate] = useState('')
  const [income, setIncome] = useState('')
  const [occupants, setOccupants] = useState(1)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function reload() {
    fetchRentalApplications().then(({ applications: rows }) => setApplications(rows ?? []))
  }

  useEffect(() => { reload() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      await submitRentalApplication({
        listingId,
        property,
        moveInDate,
        income: Number(income),
        occupants,
        notes,
      })
      setMessage('Application submitted. You will be notified when reviewed.')
      reload()
    } catch (err) {
      setMessage(err.message || 'Could not submit application')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="panel-card space-y-4 bg-surface p-5">
        <h2 className="text-lg font-semibold">Apply to rent</h2>
        <Field label="Property name">
          <input required value={property} onChange={(e) => setProperty(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Listing ID">
          <input value={listingId} onChange={(e) => setListingId(e.target.value)} className={inputClass} placeholder="From listing page URL" />
        </Field>
        <Field label="Move-in date">
          <input required type="date" value={moveInDate} onChange={(e) => setMoveInDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Monthly income (GHS)">
          <input required type="number" value={income} onChange={(e) => setIncome(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Occupants">
          <input type="number" min={1} value={occupants} onChange={(e) => setOccupants(Number(e.target.value))} className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
        </Field>
        {message && <p className="text-sm text-ink-secondary">{message}</p>}
        <button type="submit" disabled={loading} className="rounded-lg bg-brand-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? 'Submitting…' : 'Submit application'}
        </button>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Your applications</h2>
        <div className="space-y-3">
          {applications.length === 0 && <p className="text-sm text-ink-secondary">No applications yet.</p>}
          {applications.map((app) => (
            <article key={app.id} className="panel-card bg-surface-subtle p-4">
              <p className="font-semibold">{app.property}</p>
              <p className="text-sm text-ink-secondary capitalize">{app.status} · Move-in {app.moveInDate || app.move_in_date}</p>
              {app.leaseId && <p className="mt-1 text-xs text-mobile-forest">Lease created: {app.leaseId}</p>}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function RentalApplicationPage() {
  return (
    <ProtectedRoute>
      <ResponsivePageShell titleKey="hubs.renter.rentalApplication.title" subtitleKey="hubs.renter.rentalApplication.subtitle" backTo="/consumer/rent">
        <RentalApplicationContent />
      </ResponsivePageShell>
    </ProtectedRoute>
  )
}
