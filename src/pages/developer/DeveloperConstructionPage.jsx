import { useEffect, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchConstruction } from '../../services/developer-service'

const statusStyles = {
  done: 'bg-green-100 text-green-800',
  in_progress: 'bg-surface-hover text-ink',
  scheduled: 'bg-surface-subtle text-ink-secondary',
}

function Construction() {
  const [milestones, setMilestones] = useState([])

  useEffect(() => {
    fetchConstruction().then(({ milestones: rows }) => setMilestones(rows))
  }, [])

  return (
    <DeveloperShell titleKey="hubs.developer.construction.title" subtitleKey="hubs.developer.construction.subtitle">
      <div className="space-y-3">
        {milestones.map((m) => (
          <article key={m.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{m.milestone}</p>
              <p className="text-sm text-ink-secondary">{m.project} · Target {m.date}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[m.status] || statusStyles.scheduled}`}>
              {m.status.replace('_', ' ')}
            </span>
          </article>
        ))}
      </div>
    </DeveloperShell>
  )
}

export default function DeveloperConstructionPage() {
  return <ProtectedRoute><Construction /></ProtectedRoute>
}
