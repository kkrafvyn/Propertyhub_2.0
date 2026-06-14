import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import LeadPipelineBoard from '../../components/LeadPipelineBoard'
import {
  MobileCard,
  MobileHubTile,
  MobilePrimaryButton,
  MobileStat,
  MobileTextLink,
} from '../../components/ui/MobileUI'
import { IconCalendar, IconCheck, IconSparkle, IconUsers } from '../../components/icons'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchAgentDashboard, fetchLeads, fetchCalendar, updateLeadStage } from '../../services/agent-service'
import { sendLeadMessage } from '../../services/comms-service'

function AgentHome() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const links = [
    { to: '/m/agent/leads', label: t('workspace.nav.leads'), Icon: IconUsers },
    { to: '/m/agent/calendar', label: t('workspace.nav.calendar'), Icon: IconCalendar },
    { to: '/m/agent/tasks', label: t('workspace.nav.tasks'), Icon: IconCheck },
    { to: '/m/agent/coach', label: t('workspace.nav.listingCoach'), Icon: IconSparkle },
  ]

  useEffect(() => {
    fetchAgentDashboard().then(({ stats: s }) => setStats(s))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.agentWorkspace')} subtitle={t('mobile.agentPipelineMobile')} backTo="/m/profile" />
      <section className="space-y-4 px-4 pb-6">
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <MobileStat label={t('hubs.agent.dashboard.stats.activeListings')} value={stats.activeListings} />
            <MobileStat label={t('hubs.agent.dashboard.stats.leadsThisWeek')} value={stats.leadsThisWeek} />
            <MobileStat label={t('hubs.agent.dashboard.stats.viewingsScheduled')} value={stats.viewingsScheduled} />
            <MobileStat label="Pipeline" value={stats.commissionPipeline} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {links.map((item) => (
            <MobileHubTile key={item.to} {...item} />
          ))}
        </div>
        <MobileTextLink to="/agent/leads" className="block text-center">Open full CRM →</MobileTextLink>
      </section>
    </MobileShell>
  )
}

function AgentLeads() {
  const { t } = useTranslation()
  const [leads, setLeads] = useState([])

  useEffect(() => {
    fetchLeads().then(({ leads: rows }) => setLeads(rows))
  }, [])

  async function handleStageChange(leadId, stage) {
    await updateLeadStage(leadId, stage)
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, stage, updated_label: 'Just now' } : l)))
  }

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('workspace.nav.leads')} subtitle={t('hubs.agent.leads.pipelineSubtitle')} backTo="/m/agent" />
      <section className="px-2 pb-6">
        <LeadPipelineBoard leads={leads} onStageChange={handleStageChange} onMessage={sendLeadMessage} compact />
      </section>
    </MobileShell>
  )
}

function AgentCalendar() {
  const { t } = useTranslation()
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchCalendar().then(({ calendar }) => setEvents(calendar))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('workspace.nav.calendar')} backTo="/m/agent" />
      <section className="space-y-3 px-4 pb-6">
        {events.map((ev) => (
          <MobileCard key={ev.id}>
            <p className="font-semibold text-ink">{ev.title}</p>
            <p className="text-sm text-ink-secondary">{ev.date} · {ev.time}</p>
          </MobileCard>
        ))}
      </section>
    </MobileShell>
  )
}

function AgentTasksMobile() {
  const { t } = useTranslation()
  return (
    <MobileShell hideNav>
      <MobileHeader title={t('workspace.nav.tasks')} backTo="/m/agent" />
      <section className="space-y-3 px-4 pb-6">
        <MobilePrimaryButton as={Link} to="/agent/tasks">Open full tasks</MobilePrimaryButton>
      </section>
    </MobileShell>
  )
}

function AgentCoachMobile() {
  return (
    <MobileShell hideNav>
      <MobileHeader title="Listing coach" backTo="/m/agent" />
      <section className="px-4 pb-6">
        <MobileCard>
          <MobileTextLink to="/agent/coach" className="inline-block">Run full AI review →</MobileTextLink>
        </MobileCard>
      </section>
    </MobileShell>
  )
}

export function MobileAgentHomePage() {
  return <ProtectedRoute><AgentHome /></ProtectedRoute>
}

export function MobileAgentLeadsPage() {
  return <ProtectedRoute><AgentLeads /></ProtectedRoute>
}

export function MobileAgentCalendarPage() {
  return <ProtectedRoute><AgentCalendar /></ProtectedRoute>
}

export function MobileAgentTasksPage() {
  return <ProtectedRoute><AgentTasksMobile /></ProtectedRoute>
}

export function MobileAgentCoachPage() {
  return <ProtectedRoute><AgentCoachMobile /></ProtectedRoute>
}
