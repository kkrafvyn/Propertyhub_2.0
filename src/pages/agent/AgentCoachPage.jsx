import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { runListingCoach } from '../../services/intelligence-service'

const sampleListing = {
  title: 'Cantonments Sky Villa',
  verified: true,
  photos: Array(5).fill('photo'),
  description: 'Premium residence in Cantonments with concierge access and verified documentation.',
}

export default function AgentCoachPage() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleReview() {
    setLoading(true)
    const data = await runListingCoach(sampleListing)
    setResult(data)
    setLoading(false)
  }

  useEffect(() => {
    handleReview()
  }, [])

  const score = result?.score ?? 87
  const tips = result?.tips ?? []

  return (
    <ProtectedRoute>
      <AgentShell titleKey="hubs.agent.coach.title" subtitleKey="hubs.agent.coach.subtitle">
        <div className="max-w-xl panel-card bg-surface p-6">
          <p className="text-4xl font-bold text-ink">
            {score}
            <span className="text-lg text-ink-secondary">/100</span>
          </p>
          <p className="mt-2 font-medium">Listing quality score</p>
          <ul className="mt-6 space-y-2 text-sm text-ink-secondary">
            {tips.map((tip) => (
              <li key={tip}>{tip.startsWith('Add') || tip.startsWith('Include') || tip.startsWith('Expand') ? `⚠ ${tip}` : `✓ ${tip}`}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleReview}
            disabled={loading}
            className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'Analyzing…' : 'Run full AI review'}
          </button>
          {result?.source && (
            <p className="mt-3 text-xs text-ink-secondary">Source: {result.source === 'supabase' ? 'BaytMiftah AI' : 'Local coach'}</p>
          )}
        </div>
      </AgentShell>
    </ProtectedRoute>
  )
}
