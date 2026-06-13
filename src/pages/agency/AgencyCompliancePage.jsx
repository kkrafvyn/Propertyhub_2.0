import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchCompliance } from '../../services/agency-service'

const statusStyles = {
  compliant: 'bg-green-100 text-green-800',
  due_soon: 'bg-amber-100 text-amber-800',
  pending: 'bg-surface-subtle text-ink-secondary',
}

function Compliance() {
  const [items, setItems] = useState([])

  useEffect(() => {
    fetchCompliance().then(({ compliance }) => setItems(compliance))
  }, [])

  return (
    <AgencyShell title="Compliance center" subtitle="Licenses, KYC, and regulatory requirements">
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface p-4">
            <div>
              <p className="font-semibold">{item.item}</p>
              <p className="text-sm text-ink-secondary">Owner: {item.owner} · Due {item.due}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[item.status] || statusStyles.pending}`}>
              {item.status.replace('_', ' ')}
            </span>
          </article>
        ))}
      </div>
      <button type="button" className="mt-6 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">
        Add compliance item
      </button>
    </AgencyShell>
  )
}

export default function AgencyCompliancePage() {
  return <ProtectedRoute><Compliance /></ProtectedRoute>
}
