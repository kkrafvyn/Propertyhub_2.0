import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { PanelCard, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchAgentDashboard, fetchCalendar } from '../../services/agent-service'
import { useTranslation } from '../../i18n/LocaleContext'

function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const [calendar, setCalendar] = useState([])

  useEffect(() => {
    fetchAgentDashboard().then(({ stats: s }) => setStats(s))
    fetchCalendar().then(({ calendar: c }) => setCalendar(c))
  }, [])

  if (!stats) {
    return (
      <AgentShell titleKey="hubs.agent.dashboard.title" subtitle={t('common.loading')}>
        <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
      </AgentShell>
    )
  }

  return (
    <AgentShell titleKey="hubs.agent.dashboard.title" subtitleKey="hubs.agent.dashboard.loadedSubtitle">
      <StatGrid>
        <StatCard label="Active listings" value={stats.activeListings} />
        <StatCard label="Leads this week" value={stats.leadsThisWeek} />
        <StatCard label="Viewings scheduled" value={stats.viewingsScheduled} />
        <StatCard label="Conversion rate" value={stats.conversionRate} />
      </StatGrid>
      <p className="mb-8 text-sm text-ink-secondary">Commission pipeline: {stats.commissionPipeline}</p>

      <PanelCard title="Upcoming">
        <div className="space-y-3">
          {calendar.map((e) => (
            <div key={e.id} className="rounded-lg border border-surface-border px-4 py-3 text-sm">
              <p className="font-medium text-ink">{e.title}</p>
              <p className="text-ink-secondary">{e.date} · {e.time}</p>
            </div>
          ))}
        </div>
      </PanelCard>
    </AgentShell>
  )
}

export default function AgentDashboardPage() {
  return <ProtectedRoute><Dashboard /></ProtectedRoute>
}
