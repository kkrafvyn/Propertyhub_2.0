import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAgentDashboard, fetchCalendar } from '../../services/agent-service'

function Dashboard() {
  const [stats, setStats] = useState(null)
  const [calendar, setCalendar] = useState([])

  useEffect(() => {
    fetchAgentDashboard().then(({ stats: s }) => setStats(s))
    fetchCalendar().then(({ calendar: c }) => setCalendar(c))
  }, [])

  if (!stats) {
    return (
      <AgentShell title="Agent dashboard" subtitle="Loading…">
        <div className="h-32 animate-pulse rounded-card bg-surface-hover" />
      </AgentShell>
    )
  }

  return (
    <AgentShell title="Agent dashboard" subtitle="Your pipeline at a glance">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active listings" value={stats.activeListings} />
        <Stat label="Leads this week" value={stats.leadsThisWeek} />
        <Stat label="Viewings scheduled" value={stats.viewingsScheduled} />
        <Stat label="Conversion rate" value={stats.conversionRate} />
      </div>
      <p className="mt-4 text-sm text-ink-secondary">Commission pipeline: {stats.commissionPipeline}</p>

      <h2 className="mt-8 font-semibold">Upcoming</h2>
      <div className="mt-3 space-y-2">
        {calendar.map((e) => (
          <div key={e.id} className="rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
            <p className="font-medium">{e.title}</p>
            <p className="text-ink-secondary">{e.date} · {e.time}</p>
          </div>
        ))}
      </div>
    </AgentShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-4">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

export default function AgentDashboardPage() {
  return <ProtectedRoute><Dashboard /></ProtectedRoute>
}
