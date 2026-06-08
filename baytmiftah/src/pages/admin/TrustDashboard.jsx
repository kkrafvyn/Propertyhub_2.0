import { useEffect, useMemo, useState } from 'react'
import { trustService } from '../../services/mvp-service'

const fallbackSignals = [
  {
    id: 'signal-1',
    severity: 'high',
    entity_type: 'listing',
    title: 'Listing has no verification document',
    description: 'Premium listing submitted without ownership proof or agency mandate.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'signal-2',
    severity: 'medium',
    entity_type: 'agency',
    title: 'Agency profile missing tax ID',
    description: 'Agency can continue onboarding but should be flagged before approval.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'signal-3',
    severity: 'low',
    entity_type: 'lead',
    title: 'Lead intent spike detected',
    description: 'High engagement from a buyer across three luxury listings.',
    created_at: new Date().toISOString(),
  },
]

export default function TrustDashboard() {
  const [signals, setSignals] = useState(fallbackSignals)
  const [filter, setFilter] = useState('all')
  const [source, setSource] = useState('fallback')

  useEffect(() => {
    trustService
      .listSignals()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSignals(data)
          setSource('supabase')
        }
      })
      .catch(() => {
        setSignals(fallbackSignals)
        setSource('fallback')
      })
  }, [])

  const visibleSignals = useMemo(
    () => signals.filter((signal) => filter === 'all' || signal.severity === filter),
    [filter, signals]
  )

  const counts = ['high', 'medium', 'low'].map((severity) => ({
    severity,
    count: signals.filter((signal) => signal.severity === severity).length,
  }))

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-outline-variant bg-surface-container p-6">
        <p className="text-label-sm text-secondary">Trust operations</p>
        <h1 className="mt-2 text-display-md font-bold">Admin Trust Dashboard</h1>
        <p className="mt-3 max-w-3xl text-on-surface-variant">
          Review suspicious listings, agency verification gaps, lead anomalies, and AI listing review notes.
        </p>
        <p className="mt-2 text-sm text-on-surface-variant">Source: {source}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {counts.map((item) => (
          <button
            key={item.severity}
            onClick={() => setFilter(item.severity)}
            className={`rounded-lg border p-5 text-left capitalize ${
              filter === item.severity
                ? 'border-secondary bg-secondary/10'
                : 'border-outline-variant bg-surface-container'
            }`}
          >
            <p className="text-on-surface-variant">{item.severity} risk</p>
            <p className="mt-2 text-4xl font-bold text-secondary">{item.count}</p>
          </button>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {['all', 'high', 'medium', 'low'].map((item) => (
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

      <section className="space-y-4">
        {visibleSignals.map((signal) => (
          <article key={signal.id} className="rounded-lg border border-outline-variant bg-surface-container p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-secondary">
                  {signal.entity_type || 'entity'} / {signal.severity}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{signal.title || signal.signal_type}</h2>
                <p className="mt-2 text-on-surface-variant">{signal.description || signal.notes}</p>
              </div>
              <button className="btn-secondary">Open Review</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
