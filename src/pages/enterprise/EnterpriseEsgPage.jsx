import { useEffect, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchEsgMetrics } from '../../services/enterprise-service'

function Esg() {
  const [esg, setEsg] = useState(null)

  useEffect(() => {
    fetchEsgMetrics().then(({ esg: data }) => setEsg(data))
  }, [])

  if (!esg) return null

  return (
    <EnterpriseShell titleKey="hubs.enterprise.esg.title" subtitle={`Governance rating: ${esg.governanceRating}`}>
      <div className="mb-6 flex items-end gap-4">
        <p className="text-5xl font-bold text-ink">{esg.score}</p>
        <p className="pb-2 text-lg text-ink-secondary">ESG score</p>
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Carbon intensity" value={esg.carbonIntensity} />
        <Stat label="Renewable share" value={esg.renewableShare} />
        <Stat label="Social housing units" value={esg.socialHousingUnits} />
      </div>
      <ul className="space-y-3">
        {esg.metrics.map((m) => (
          <li key={m.label} className="flex justify-between rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
            <span>{m.label}</span>
            <span className="font-semibold">{m.value} <span className="text-ink-secondary">({m.trend})</span></span>
          </li>
        ))}
      </ul>
    </EnterpriseShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="panel-card bg-surface p-4">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  )
}

export default function EnterpriseEsgPage() {
  return <ProtectedRoute><Esg /></ProtectedRoute>
}
