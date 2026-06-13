import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchLeads } from '../../services/agent-service'
import { LEAD_STAGES } from '../../data/agent'

const stageLabels = {
  lead: 'Lead',
  contacted: 'Contacted',
  viewing: 'Viewing',
  offer: 'Offer',
  closed: 'Closed',
}

function LeadsBoard() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeads().then(({ leads: rows }) => {
      setLeads(rows)
      setLoading(false)
    })
  }, [])

  const byStage = LEAD_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.stage === stage)
    return acc
  }, {})

  if (loading) {
    return (
      <AgentShell title="Lead pipeline" subtitle="Loading…">
        <div className="h-48 animate-pulse rounded-card bg-surface-hover" />
      </AgentShell>
    )
  }

  return (
    <AgentShell title="Lead pipeline" subtitle="Lead → Contacted → Viewing → Offer → Closed">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => (
          <div key={stage} className="min-w-[220px] flex-1 rounded-card border border-surface-border bg-surface-subtle p-3">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-secondary">
              {stageLabels[stage]} ({byStage[stage].length})
            </h3>
            <div className="space-y-2">
              {byStage[stage].map((lead) => (
                <article key={lead.id} className="rounded-lg border border-surface-border bg-surface p-3 text-sm shadow-sm">
                  <p className="font-semibold">{lead.name}</p>
                  <p className="text-ink-secondary">{lead.property}</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    GHS {Number(lead.value).toLocaleString()} · {lead.updated_label || lead.updated}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AgentShell>
  )
}

export default function AgentLeadsPage() {
  return <ProtectedRoute><LeadsBoard /></ProtectedRoute>
}
