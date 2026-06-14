import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchTrustScore } from '../../services/agency-service'

function Trust() {
  const [trust, setTrust] = useState(null)

  useEffect(() => {
    fetchTrustScore().then(({ trust: data }) => setTrust(data))
  }, [])

  if (!trust) return null

  return (
    <AgencyShell titleKey="hubs.agency.trust.title" subtitle={`Last reviewed ${trust.lastReview}`}>
      <div className="flex flex-wrap items-end gap-4">
        <p className="text-5xl font-bold text-ink">{trust.score}</p>
        <p className="pb-2 text-lg text-green-700">{trust.trend} this month</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {trust.badges.map((b) => (
          <span key={b} className="rounded-full bg-surface-hover px-3 py-1 text-xs font-semibold text-ink">{b}</span>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {trust.factors.map((f) => (
          <div key={f.label}>
            <div className="flex justify-between text-sm">
              <span>{f.label}</span>
              <span className="font-semibold">{f.score}% · {f.weight}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand-accent" style={{ width: `${f.score}%` }} />
            </div>
          </div>
        ))}
      </div>
    </AgencyShell>
  )
}

export default function AgencyTrustPage() {
  return <ProtectedRoute><Trust /></ProtectedRoute>
}
