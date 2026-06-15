import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchConstruction, fetchDeveloperBuyers, notifyBuyersOfMilestone } from '../../services/developer-service'

const statusStyles = {
  done: 'bg-green-100 text-green-800',
  in_progress: 'bg-surface-hover text-ink',
  scheduled: 'bg-surface-subtle text-ink-secondary',
}

function Construction() {
  const [milestones, setMilestones] = useState([])
  const [buyers, setBuyers] = useState([])
  const [notifying, setNotifying] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchConstruction().then(({ milestones: rows }) => setMilestones(rows))
    fetchDeveloperBuyers().then(({ buyers: rows }) => setBuyers(rows))
  }, [])

  async function handleNotify(milestone) {
    setNotifying(milestone.id)
    setMessage('')
    const result = await notifyBuyersOfMilestone(milestone)
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestone.id ? { ...m, buyerNotified: true } : m)),
    )
    setMessage(`Buyer portal updated — ${result.notified ?? 0} notification(s) sent.`)
    setNotifying(null)
  }

  return (
    <DeveloperShell titleKey="hubs.developer.construction.title" subtitleKey="hubs.developer.construction.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <div className="mb-6 panel-card bg-surface-subtle p-4">
        <p className="text-sm font-semibold text-ink">Buyer portal</p>
        <p className="mt-1 text-sm text-ink-secondary">
          {buyers.length} active buyers across projects — milestone updates sync to buyer dashboards.
        </p>
        <Link to="/buyer" className="mt-2 inline-block text-sm font-semibold text-brand-accent underline">
          Open buyer hub →
        </Link>
      </div>

      <div className="space-y-3">
        {milestones.map((m) => (
          <article key={m.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{m.milestone}</p>
              <p className="text-sm text-ink-secondary">{m.project} · Target {m.date}</p>
              {m.buyerNotified && (
                <p className="mt-1 text-xs font-semibold text-green-700">Buyers notified</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[m.status] || statusStyles.scheduled}`}>
                {m.status.replace('_', ' ')}
              </span>
              {!m.buyerNotified && (m.status === 'done' || m.status === 'in_progress') && (
                <button
                  type="button"
                  onClick={() => handleNotify(m)}
                  disabled={notifying === m.id}
                  className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-hover disabled:opacity-60"
                >
                  {notifying === m.id ? 'Sending…' : 'Notify buyers'}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </DeveloperShell>
  )
}

export default function DeveloperConstructionPage() {
  return <ProtectedRoute><Construction /></ProtectedRoute>
}
