import { Link } from 'react-router-dom'

import MobileShell, { MobileHeader } from '../../components/MobileShell'

import ProtectedRoute from '../../components/ProtectedRoute'

import { IconCalendar, IconCheck, IconSparkle, IconUsers } from '../../components/icons'

import { agentStats, agentLeads, agentCalendar } from '../../data/agent'



const links = [

  { to: '/m/agent/leads', label: 'Leads', Icon: IconUsers },

  { to: '/m/agent/calendar', label: 'Calendar', Icon: IconCalendar },

  { to: '/m/agent/tasks', label: 'Tasks', Icon: IconCheck },

  { to: '/m/agent/coach', label: 'Listing coach', Icon: IconSparkle },

]



function AgentHome() {

  return (

    <MobileShell hideNav>

      <MobileHeader title="Agent CRM" subtitle="Mobile workspace" />

      <section className="space-y-4 px-4 pb-6">

        <div className="grid grid-cols-2 gap-3">

          <Stat label="Active listings" value={agentStats.activeListings} />

          <Stat label="Leads this week" value={agentStats.leadsThisWeek} />

          <Stat label="Viewings" value={agentStats.viewingsScheduled} />

          <Stat label="Pipeline" value={agentStats.commissionPipeline} />

        </div>

        <div className="grid grid-cols-2 gap-3">

          {links.map(({ to, label, Icon }) => (

            <Link key={to} to={to} className="rounded-2xl bg-surface p-4 shadow-sm">

              <Icon className="h-7 w-7 text-brand-dark" />

              <p className="mt-2 font-semibold">{label}</p>

            </Link>

          ))}

        </div>

        <Link to="/" className="block text-center text-sm text-brand-dark underline">← Marketplace</Link>

      </section>

    </MobileShell>

  )

}



function Stat({ label, value }) {

  return (

    <div className="rounded-2xl bg-surface p-4 shadow-sm">

      <p className="text-xs text-ink-secondary">{label}</p>

      <p className="mt-1 text-lg font-bold text-brand-dark">{value}</p>

    </div>

  )

}



function AgentLeads() {

  return (

    <MobileShell hideNav>

      <MobileHeader title="Leads" backTo="/m/agent" />

      <section className="space-y-3 px-4 pb-6">

        {agentLeads.map((lead) => (

          <article key={lead.id} className="rounded-2xl bg-surface p-4 shadow-sm">

            <p className="font-semibold">{lead.name}</p>

            <p className="text-sm text-ink-secondary">{lead.property}</p>

            <div className="mt-2 flex items-center justify-between text-xs">

              <span className="rounded-full bg-brand-light px-2 py-0.5 font-semibold capitalize text-brand-dark">{lead.stage}</span>

              <span className="text-ink-secondary">GHS {lead.value.toLocaleString()}</span>

            </div>

          </article>

        ))}

      </section>

    </MobileShell>

  )

}



function AgentCalendar() {

  return (

    <MobileShell hideNav>

      <MobileHeader title="Calendar" backTo="/m/agent" />

      <section className="space-y-3 px-4 pb-6">

        {agentCalendar.map((ev) => (

          <article key={ev.id} className="rounded-2xl bg-surface p-4 shadow-sm">

            <p className="font-semibold">{ev.title}</p>

            <p className="text-sm text-ink-secondary">{ev.date} · {ev.time}</p>

          </article>

        ))}

      </section>

    </MobileShell>

  )

}



function AgentTasksMobile() {

  return (

    <MobileShell hideNav>

      <MobileHeader title="Tasks" backTo="/m/agent" />

      <section className="space-y-3 px-4 pb-6">

        <p className="text-sm text-ink-secondary">Open desktop CRM for full task management.</p>

        <Link to="/agent/tasks" className="inline-block rounded-xl bg-brand-dark px-4 py-2 text-sm font-semibold text-brand">

          Open full tasks

        </Link>

      </section>

    </MobileShell>

  )

}



function AgentCoachMobile() {

  return (

    <MobileShell hideNav>

      <MobileHeader title="Listing coach" backTo="/m/agent" />

      <section className="px-4 pb-6">

        <div className="rounded-2xl bg-surface p-5 shadow-sm">

          <p className="text-4xl font-bold text-brand-dark">87<span className="text-lg text-ink-secondary">/100</span></p>

          <p className="mt-2 font-medium">Sample listing quality score</p>

          <Link to="/agent/coach" className="mt-4 inline-block text-sm font-semibold text-brand-dark underline">

            Run full AI review →

          </Link>

        </div>

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

