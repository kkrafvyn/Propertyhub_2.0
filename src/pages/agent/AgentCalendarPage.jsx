import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchCalendar } from '../../services/agent-service'

function Calendar() {
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetchCalendar().then(({ calendar }) => setEvents(calendar))
  }, [])

  return (
    <AgentShell titleKey="hubs.agent.calendar.title" subtitleKey="hubs.agent.calendar.subtitle">
      <div className="space-y-3">
        {events.map((e) => (
          <article key={e.id} className="flex items-center justify-between panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{e.title}</p>
              <p className="text-sm text-ink-secondary">{e.date} at {e.time}</p>
            </div>
            <button type="button" className="text-sm font-medium text-ink underline">Reschedule</button>
          </article>
        ))}
      </div>
    </AgentShell>
  )
}

export default function AgentCalendarPage() {
  return <ProtectedRoute><Calendar /></ProtectedRoute>
}
