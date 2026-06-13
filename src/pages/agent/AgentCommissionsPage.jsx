import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchCommissions } from '../../services/agent-service'

function Commissions() {
  const [commissions, setCommissions] = useState([])

  useEffect(() => {
    fetchCommissions().then(({ commissions: rows }) => setCommissions(rows))
  }, [])

  const total = commissions.reduce((sum, c) => sum + c.amount, 0)

  return (
    <AgentShell title="Commissions" subtitle="Track paid, pending, and pipeline earnings">
      <p className="mb-6 text-2xl font-bold text-brand-dark">GHS {total.toLocaleString()}</p>
      <div className="space-y-3">
        {commissions.map((c) => (
          <article key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-surface-border bg-surface p-4">
            <div>
              <p className="font-semibold">{c.property}</p>
              <p className="text-sm text-ink-secondary">Closed: {c.closed}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-brand-dark">GHS {c.amount.toLocaleString()}</p>
              <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold capitalize text-brand-dark">{c.status}</span>
            </div>
          </article>
        ))}
      </div>
    </AgentShell>
  )
}

export default function AgentCommissionsPage() {
  return <ProtectedRoute><Commissions /></ProtectedRoute>
}
