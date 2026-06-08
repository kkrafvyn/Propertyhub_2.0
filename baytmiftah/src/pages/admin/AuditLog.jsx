import { useMemo, useState } from 'react'
import { exportAuditCsv, getAuditEvents, recordAuditEvent } from '../../services/audit-service'

export default function AuditLog() {
  const [events, setEvents] = useState(getAuditEvents)
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')

  const visibleEvents = useMemo(
    () => events.filter((event) => filter === 'all' || event.severity === filter),
    [events, filter]
  )

  const addManualEvent = async () => {
    const { event, source } = await recordAuditEvent({
      action: 'Added manual audit note',
      entity: 'Platform',
      severity: 'info',
    })
    setEvents((current) => [event, ...current])
    setNotice(
      source === 'supabase'
        ? 'Audit event persisted in Supabase.'
        : 'Audit event saved locally. Admin backend persistence requires deployed tables and access.'
    )
  }

  const downloadCsv = () => {
    const blob = new Blob([exportAuditCsv()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'baytmiftah-audit-log.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
        <p className="text-label-sm text-secondary">Governance</p>
        <h1 className="mt-2 text-display-md font-bold">Admin Audit Log</h1>
        <p className="mt-3 text-on-surface-variant">
          Track review actions, trust events, listing changes, and operational notes.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={addManualEvent} className="btn-secondary">Add Note</button>
          <button onClick={downloadCsv} className="btn-primary">Export CSV</button>
        </div>
        {notice && <p className="mt-4 text-sm font-semibold text-on-surface-variant">{notice}</p>}
      </section>

      <div className="flex flex-wrap gap-2">
        {['all', 'info', 'warning', 'critical'].map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-full px-5 py-2 font-semibold capitalize ${
              filter === item ? 'bg-secondary text-on-secondary' : 'bg-surface-container'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
        {visibleEvents.map((event) => (
          <article key={event.id} className="grid gap-4 border-b border-outline-variant p-5 last:border-b-0 md:grid-cols-[180px_1fr_auto]">
            <div>
              <p className="font-semibold">{event.actor}</p>
              <p className="text-sm text-on-surface-variant">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <h2 className="font-semibold">{event.action}</h2>
              <p className="text-sm text-on-surface-variant">{event.entity}</p>
            </div>
            <span className="h-fit rounded-full bg-secondary/15 px-3 py-1 text-sm font-bold capitalize text-secondary">
              {event.severity}
            </span>
          </article>
        ))}
      </section>
    </div>
  )
}
