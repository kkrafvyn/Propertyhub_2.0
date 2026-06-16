import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { IconCheck, IconWarning } from '../../components/icons'
import { runListingCoach } from '../../services/intelligence-service'
import { fetchMyListings } from '../../services/listing-service'

function listingToCoachPayload(listing) {
  return {
    title: listing.title,
    verified: listing.verified ?? listing.status === 'active',
    photos: listing.photos ?? (listing.image ? [listing.image] : []),
    description: listing.description ?? '',
  }
}

export default function AgentCoachPage() {
  const [listings, setListings] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchMyListings().then(({ listings: rows }) => {
      setListings(rows ?? [])
      if (rows?.[0]) setSelectedId(rows[0].id)
    })
  }, [])

  const selected = listings.find((l) => l.id === selectedId)

  async function handleReview() {
    if (!selected) return
    setLoading(true)
    const data = await runListingCoach(listingToCoachPayload(selected))
    setResult(data)
    setLoading(false)
  }

  useEffect(() => {
    if (selected) handleReview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const score = result?.score ?? (selected ? 72 : 0)
  const tips = result?.tips ?? []

  return (
    <ProtectedRoute>
      <AgentShell titleKey="hubs.agent.coach.title" subtitleKey="hubs.agent.coach.subtitle">
        {listings.length > 0 ? (
          <div className="mb-4 max-w-xl">
            <label className="block text-sm font-medium text-ink">Listing to review</label>
            <select
              className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2 text-sm"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {listings.map((l) => (
                <option key={l.id} value={l.id}>{l.title}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mb-4 text-sm text-ink-secondary">No listings yet — create one to run the AI coach.</p>
        )}

        <div className="max-w-xl panel-card bg-surface p-6">
          {selected && (
            <p className="mb-4 text-sm text-ink-secondary">Reviewing: <span className="font-semibold text-ink">{selected.title}</span></p>
          )}
          <p className="text-4xl font-bold text-ink">
            {score}
            <span className="text-lg text-ink-secondary">/100</span>
          </p>
          <p className="mt-2 font-medium">Listing quality score</p>
          <ul className="mt-6 space-y-2 text-sm text-ink-secondary">
            {tips.map((tip) => {
              const isWarning = tip.startsWith('Add') || tip.startsWith('Include') || tip.startsWith('Expand')
              return (
              <li key={tip} className="flex items-start gap-2">
                {isWarning ? (
                  <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                )}
                <span>{tip}</span>
              </li>
            )})}
          </ul>
          <button
            type="button"
            onClick={handleReview}
            disabled={loading || !selected}
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
