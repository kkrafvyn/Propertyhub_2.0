import { useCallback, useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { approveListing, fetchModerationQueue, rejectListing } from '../../services/moderation-service'

const statusBadge = {
  pending_review: 'bg-amber-100 text-amber-900',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
}

function ModerationQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchModerationQueue().then(({ queue: rows }) => {
      setQueue(rows)
      setLoading(false)
    }).catch((err) => {
      setError(err.message || 'Could not load queue')
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApprove(listingId) {
    setBusyId(listingId)
    setError('')
    try {
      await approveListing(listingId)
      setQueue((prev) => prev.filter((item) => item.id !== listingId))
    } catch (err) {
      setError(err.message || 'Approve failed')
    }
    setBusyId(null)
  }

  async function handleReject(item) {
    const reason = window.prompt('Reason for rejection (optional):', 'Needs more photos or documentation')
    if (reason === null) return
    setBusyId(item.id)
    setError('')
    try {
      await rejectListing(item.id, reason || 'Needs changes', item.submitted_by)
      setQueue((prev) => prev.filter((row) => row.id !== item.id))
    } catch (err) {
      setError(err.message || 'Reject failed')
    }
    setBusyId(null)
  }

  return (
    <AdminShell titleKey="hubs.admin.moderation.title" subtitleKey="hubs.admin.moderation.subtitle">
      {error && (
        <p className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      )}
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
      ) : queue.length === 0 ? (
        <p className="panel-card p-8 text-center text-ink-secondary">
          No listings pending review.
        </p>
      ) : (
        <div className="space-y-4">
          {queue.map((item) => (
            <article key={item.id} className="panel-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-sm text-ink-secondary">{item.location} · {item.type} · {item.listing_type || item.listingType}</p>
                  <p className="mt-1 text-sm text-ink-secondary">Host: {item.host} · {item.price_label || `GHS ${item.price}`}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadge[item.status] || statusBadge.pending_review}`}>
                  {item.status?.replace('_', ' ')}
                </span>
              </div>
              {item.description && (
                <p className="mt-2 line-clamp-2 text-sm text-ink-secondary">{item.description}</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => handleApprove(item.id)}
                  className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Approve & publish
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => handleReject(item)}
                  className="rounded-lg border border-ink px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <button type="button" onClick={load} className="mt-4 text-sm font-semibold text-ink underline">
        Refresh queue
      </button>
    </AdminShell>
  )
}

export default function AdminModerationPage() {
  return <ProtectedRoute><ModerationQueue /></ProtectedRoute>
}
