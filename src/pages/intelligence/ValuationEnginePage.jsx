import { useEffect, useState } from 'react'
import IntelligenceShell from '../../components/IntelligenceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { runValuation, fetchValuationHistory } from '../../services/intelligence-service'

function Valuation() {
  const [address, setAddress] = useState('Cantonments, Accra')
  const [bedrooms, setBedrooms] = useState(4)
  const [sqft, setSqft] = useState(3200)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchValuationHistory().then(({ valuations }) => setHistory(valuations))
  }, [])

  async function handleValuate(e) {
    e.preventDefault()
    setLoading(true)
    const data = await runValuation({ address, bedrooms, sqft })
    setResult(data)
    setLoading(false)
  }

  return (
    <IntelligenceShell titleKey="hubs.intelligence.valuationEngine.title" subtitleKey="hubs.intelligence.valuationEngine.subtitle">
      <form onSubmit={handleValuate} className="max-w-lg space-y-3 panel-card bg-surface p-5">
        <input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address or neighborhood" className="w-full rounded-lg border border-surface-border px-4 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-3">
          <input type="number" min={1} value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} placeholder="Bedrooms" className="rounded-lg border border-surface-border px-4 py-2 text-sm" />
          <input type="number" min={500} value={sqft} onChange={(e) => setSqft(Number(e.target.value))} placeholder="Sqft" className="rounded-lg border border-surface-border px-4 py-2 text-sm" />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? 'Analyzing…' : 'Get valuation'}
        </button>
      </form>

      {result && (
        <div className="mt-6 max-w-lg rounded-xl border border-surface-border bg-surface-subtle p-5">
          <p className="text-3xl font-bold text-ink">GHS {result.estimated?.toLocaleString()}</p>
          <p className="mt-1 text-sm">Range: {result.range} · Confidence: {result.confidence}%</p>
          <p className="mt-2 text-xs text-ink-secondary">Method: {result.method} · Source: {result.source === 'supabase' ? 'BaytMiftah AI' : 'Local model'}</p>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 font-semibold">Recent valuations</h3>
          <div className="space-y-2">
            {history.map((v) => (
              <div key={v.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
                <span>{v.address}</span>
                <span className="font-semibold text-ink">GHS {v.estimated.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </IntelligenceShell>
  )
}

export default function ValuationEnginePage() {
  return <ProtectedRoute><Valuation /></ProtectedRoute>
}
