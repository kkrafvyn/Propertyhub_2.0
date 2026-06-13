import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchInspections } from '../../services/pms-service'

function Inspections() {
  const [inspections, setInspections] = useState([])

  useEffect(() => {
    fetchInspections().then(({ inspections: rows }) => setInspections(rows))
  }, [])

  return (
    <ManageShell title="Inspection reports" subtitle="Move-in, quarterly, and move-out inspections">
      <div className="space-y-3">
        {inspections.map((insp) => (
          <article key={insp.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface p-4">
            <div>
              <p className="font-semibold">{insp.unit}</p>
              <p className="text-sm text-ink-secondary">{insp.type} · {insp.inspector} · {insp.date}</p>
            </div>
            <div className="flex items-center gap-3">
              {insp.score != null && <span className="font-bold text-brand-dark">{insp.score}/100</span>}
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold capitalize text-brand-dark">{insp.status}</span>
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="mt-4 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">Schedule inspection</button>
    </ManageShell>
  )
}

export default function ManageInspectionsPage() {
  return <ProtectedRoute><Inspections /></ProtectedRoute>
}
