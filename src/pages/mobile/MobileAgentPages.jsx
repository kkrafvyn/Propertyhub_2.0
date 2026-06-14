import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import {
  MobileBadge,
  MobileCard,
  MobileHubTile,
  MobilePrimaryButton,
  MobileStat,
  MobileTextLink,
} from '../../components/ui/MobileUI'
import { IconCalendar, IconCheck, IconSparkle, IconUsers } from '../../components/icons'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchAgentDashboard, fetchLeads, fetchCalendar } from '../../services/agent-service'
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
        <MobileTextLink to="/" className="block text-center">← Marketplace</MobileTextLink>
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

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('workspace.nav.leads')} backTo="/m/agent" />
      <section className="space-y-3 px-4 pb-6">
        {leads.map((lead) => (
          <MobileCard key={lead.id}>
            <p className="font-semibold text-ink">{lead.name}</p>
            <p className="text-sm text-ink-secondary">{lead.property}</p>
            <div className="mt-2 flex items-center justify-between">
              <MobileBadge tone="neutral">{lead.stage}</MobileBadge>
              <span className="text-xs text-ink-secondary">GHS {Number(lead.value).toLocaleString()}</span>
            </div>
            {lead.phone && (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => sendLeadMessage({ lead, body: `Hi ${lead.name}, following up on ${lead.property}.`, channel: 'whatsapp' })}
                  className="text-xs font-semibold text-brand-accent underline"
                >
                  {t('extensions.crm.whatsapp')}
                </button>
                <MobileTextLink to="/agent/leads">Full pipeline →</MobileTextLink>
              </div>
            )}
          </MobileCard>
        ))}
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
        <p className="text-sm text-ink-secondary">Open desktop CRM for full task management.</p>
        <MobilePrimaryButton as={Link} to="/agent/tasks">Open full tasks</MobilePrimaryButton>
      </section>
    </MobileShell>
  )
}

function AgentCoachMobile() {
  const { t } = useTranslation()
  return (
    <MobileShell hideNav>
      <MobileHeader title={t('workspace.nav.listingCoach')} backTo="/m/agent" />
      <section className="px-4 pb-6">
        <MobileCard>
          <p className="text-4xl font-semibold text-ink">
            87<span className="text-lg text-ink-secondary">/100</span>
          </p>
          <p className="mt-2 font-medium text-ink">Sample listing quality score</p>
          <MobileTextLink to="/agent/coach" className="mt-4 inline-block">Run full AI review →</MobileTextLink>
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
