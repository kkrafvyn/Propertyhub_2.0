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
import { fetchAgentViewings, updateViewingStatus } from '../../services/booking-service'
import { sendLeadMessage } from '../../services/comms-service'

function AgentHome() {
  const { t } = useTranslation()
  const [stats, setStats] = useState(null)
  const links = [
    { to: '/host/list', label: t('host.title'), Icon: IconSparkle },
    { to: '/agent/leads', label: t('workspace.nav.leads'), Icon: IconUsers },
    { to: '/agent/calendar', label: t('workspace.nav.calendar'), Icon: IconCalendar },
    { to: '/agent/tasks', label: t('workspace.nav.tasks'), Icon: IconCheck },
    { to: '/agent/coach', label: t('workspace.nav.listingCoach'), Icon: IconSparkle },
  ]

  useEffect(() => {
    fetchAgentDashboard().then(({ stats: s }) => setStats(s))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.agentWorkspace')} backTo="/profile" />
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
        <MobileTextLink to="/agent/leads" className="w-full justify-center" arrow="right">
          Open full CRM
        </MobileTextLink>
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
      <MobileHeader title={t('workspace.nav.leads')} backTo="/agent" />
      <section className="px-2 pb-6">
        <LeadPipelineBoard leads={leads} onStageChange={handleStageChange} onMessage={sendLeadMessage} compact />
      </section>
    </MobileShell>
  )
}

function AgentCalendar() {
  const { t } = useTranslation()
  const [events, setEvents] = useState([])
  const [viewings, setViewings] = useState([])
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    fetchCalendar().then(({ calendar }) => setEvents(calendar))
    fetchAgentViewings().then(({ viewings: rows }) => setViewings(rows))
  }, [])

  async function handleViewingAction(viewing, status) {
    setBusyId(viewing.id)
    await updateViewingStatus(viewing.id, status, {
      userId: viewing.user_id,
      date: viewing.preferred_date,
      listingTitle: viewing.listing_id,
    })
    setViewings((prev) => prev.filter((v) => v.id !== viewing.id || status !== 'cancelled'))
    if (status === 'confirmed') {
      setViewings((prev) => prev.map((v) => (v.id === viewing.id ? { ...v, status: 'confirmed' } : v)))
    }
    setBusyId(null)
  }

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('workspace.nav.calendar')} backTo="/agent" />
      <section className="space-y-3 px-4 pb-6">
        {viewings.length > 0 && (
          <>
            <p className="text-sm font-semibold text-ink">{t('mobile.agentViewings')}</p>
            {viewings.map((v) => (
              <MobileCard key={v.id}>
                <p className="font-semibold text-ink">{v.listing_id}</p>
                <p className="text-sm text-ink-secondary">{v.preferred_date} · {v.guests} guests · {v.status}</p>
                {v.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === v.id}
                      onClick={() => handleViewingAction(v, 'confirmed')}
                      className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {t('mobile.viewingConfirm')}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === v.id}
                      onClick={() => handleViewingAction(v, 'cancelled')}
                      className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                    >
                      {t('mobile.tripsCancel')}
                    </button>
                  </div>
                )}
              </MobileCard>
            ))}
          </>
        )}
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
      <MobileHeader title={t('workspace.nav.tasks')} backTo="/agent" />
      <section className="space-y-3 px-4 pb-6">
        <MobilePrimaryButton as={Link} to="/agent/tasks">Open full tasks</MobilePrimaryButton>
      </section>
    </MobileShell>
  )
}

function AgentCoachMobile() {
  return (
    <MobileShell hideNav>
      <MobileHeader title="Listing coach" backTo="/agent" />
      <section className="px-4 pb-6">
        <MobileCard>
          <MobileTextLink to="/agent/coach" arrow="right">
            Run full AI review
          </MobileTextLink>
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
