import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchCalendar } from '../../services/agent-service'
import { fetchAgentViewings, updateViewingStatus } from '../../services/booking-service'

function Calendar() {
  const { t } = useTranslation()
  const [events, setEvents] = useState([])
  const [viewings, setViewings] = useState([])
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    fetchCalendar().then(({ calendar }) => setEvents(calendar))
    fetchAgentViewings().then(({ viewings: rows }) => setViewings(rows ?? []))
  }, [])

  async function handleViewingAction(viewing, status) {
    setBusyId(viewing.id)
    await updateViewingStatus(viewing.id, status, {
      userId: viewing.user_id,
      date: viewing.preferred_date,
      listingTitle: viewing.listing_id,
    })
    setViewings((prev) =>
      prev.map((v) => (v.id === viewing.id ? { ...v, status } : v)).filter((v) => status !== 'cancelled' || v.id !== viewing.id),
    )
    if (status === 'confirmed') {
      fetchCalendar().then(({ calendar }) => setEvents(calendar))
    }
    setBusyId(null)
  }

  return (
    <AgentShell titleKey="hubs.agent.calendar.title" subtitleKey="hubs.agent.calendar.subtitle">
      <div className="space-y-3">
        {viewings.length > 0 && (
          <>
            <p className="text-sm font-semibold text-ink">{t('mobile.agentViewings')}</p>
            {viewings.map((v) => (
              <article key={v.id} className="panel-card bg-surface p-4">
                <p className="font-semibold">{v.listing_id}</p>
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
              </article>
            ))}
          </>
        )}
        {events.map((e) => (
          <article key={e.id} className="flex items-center justify-between panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{e.title}</p>
              <p className="text-sm text-ink-secondary">{e.date} at {e.time}</p>
            </div>
            <span className="text-xs capitalize text-ink-secondary">{e.type}</span>
          </article>
        ))}
      </div>
    </AgentShell>
  )
}

export default function AgentCalendarPage() {
  return <ProtectedRoute><Calendar /></ProtectedRoute>
}
