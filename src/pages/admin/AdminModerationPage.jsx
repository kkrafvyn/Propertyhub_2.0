import { useCallback, useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { approveListing, fetchModerationQueue, rejectListing } from '../../services/moderation-service'

const statusBadge = {
  pending_review: 'bg-brand/20 text-brand',
  active: 'bg-green-500/20 text-green-300',
  rejected: 'bg-red-500/20 text-red-300',
}

function ModerationQueue() {
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchModerationQueue().then(({ queue: rows }) => {
      setQueue(rows)
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  async function handleApprove(listingId) {
    setBusyId(listingId)
    await approveListing(listingId)
    setQueue((prev) => prev.filter((item) => item.id !== listingId))
    setBusyId(null)
  }

  async function handleReject(item) {
    const reason = window.prompt('Reason for rejection (optional):', 'Needs more photos or documentation')
    if (reason === null) return
    setBusyId(item.id)
    await rejectListing(item.id, reason || 'Needs changes', item.submitted_by)
    setQueue((prev) => prev.filter((row) => row.id !== item.id))
    setBusyId(null)
  }

  return (
    <AdminShell title="Moderation queue" subtitle="Review submitted listings — approve to publish on marketplace">
      {loading ? (
        <div className="h-32 animate-pulse rounded-card bg-white/5" />
      ) : queue.length === 0 ? (
        <p className="rounded-card border border-white/10 bg-white/5 p-8 text-center text-white/70">
          No listings pending review.
        </p>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <article key={item.id} className="rounded-card border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-white/70">{item.location} · {item.type} · {item.listing_type || item.listingType}</p>
                  <p className="mt-1 text-sm text-white/60">Host: {item.host} · {item.price_label || `GHS ${item.price}`}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadge[item.status] || statusBadge.pending_review}`}>
                  {item.status?.replace('_', ' ')}
                </span>
              </div>
              {item.description && (
                <p className="mt-2 line-clamp-2 text-sm text-white/60">{item.description}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => handleApprove(item.id)}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-dark disabled:opacity-60"
                >
                  Approve & publish
                </button>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  onClick={() => handleReject(item)}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      <button type="button" onClick={load} className="mt-4 text-sm text-brand underline">
        Refresh queue
      </button>
    </AdminShell>
  )
}

export default function AdminModerationPage() {
  return <ProtectedRoute><ModerationQueue /></ProtectedRoute>
}
