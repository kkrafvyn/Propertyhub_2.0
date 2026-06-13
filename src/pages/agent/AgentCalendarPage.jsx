import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { agentCalendar } from '../../data/agent'

export default function AgentCalendarPage() {
  return (
    <ProtectedRoute>
      <AgentShell title="Calendar" subtitle="Viewings, calls, and tasks">
        <div className="space-y-3">
          {agentCalendar.map((e) => (
            <article key={e.id} className="flex items-center justify-between rounded-card border border-surface-border bg-surface p-4">
              <div>
                <p className="font-semibold">{e.title}</p>
                <p className="text-sm text-ink-secondary">{e.date} at {e.time}</p>
              </div>
              <button type="button" className="text-sm font-medium text-brand-dark underline">Reschedule</button>
            </article>
          ))}
        </div>
      </AgentShell>
    </ProtectedRoute>
  )
}
