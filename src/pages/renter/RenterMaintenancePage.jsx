import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchMaintenanceRequests, submitMaintenanceRequest } from '../../services/renter-service'

function Maintenance() {
  const [requests, setRequests] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('General')
  const [priority, setPriority] = useState('medium')

  useEffect(() => {
    fetchMaintenanceRequests().then(({ requests: rows }) => setRequests(rows))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    await submitMaintenanceRequest({ title, category, priority })
    const { requests: rows } = await fetchMaintenanceRequests()
    setRequests(rows)
    setShowForm(false)
    setTitle('')
  }

  return (
    <RenterShell titleKey="hubs.renter.maintenance.title" subtitleKey="hubs.renter.maintenance.subtitle">
      <button type="button" onClick={() => setShowForm(true)} className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
        New request
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-3 panel-card bg-surface-subtle p-5">
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the issue" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm">
            {['General', 'Plumbing', 'HVAC', 'Electrical', 'Security'].map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">Submit</button>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {requests.map((r) => (
          <article key={r.id} className="panel-card bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="font-semibold">{r.title}</p>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{r.status.replace('_', ' ')}</span>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">{r.category} · {r.priority} priority · {r.submitted}</p>
          </article>
        ))}
      </div>
    </RenterShell>
  )
}

export default function RenterMaintenancePage() {
  return <ProtectedRoute><Maintenance /></ProtectedRoute>
}
