import React, { useEffect, useState } from 'react'
import Navigation from '../../components/Navigation'
import Header from '../../components/Header'
import { moderationService } from '../../services/production-service'

export default function ModerationQueue() {
  const [statusFilter, setStatusFilter] = useState('queued')
  const [queue, setQueue] = useState([])
  const [notice, setNotice] = useState('')

  const loadQueue = () => moderationService.listQueue(statusFilter).then(setQueue)

  useEffect(() => {
    loadQueue()
  }, [statusFilter])

  const decide = async (review, decision) => {
    await moderationService.recordDecision({
      reviewId: review.id,
      status: decision === 'approve' ? 'approved' : 'blocked',
      decision,
      reasonCodes: review.reason_codes || review.reasonCodes || [],
      notes: `${decision} from admin moderation queue`,
    })
    setNotice(`Listing review ${decision} recorded.`)
    loadQueue()
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Moderation Queue" />
        <div className="px-4 pt-24 md:px-8">
          <div className="mx-auto max-w-container space-y-6">
            <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-widest text-secondary">Trust operations</p>
                  <h2 className="mt-2 text-2xl font-semibold">Listing review workflow</h2>
                </div>
                <select
                  className="input-field w-full md:w-56"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="queued">Queued</option>
                  <option value="approved">Approved</option>
                  <option value="blocked">Blocked</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
            </section>

            {notice && <p className="rounded-md bg-secondary/10 p-3 text-sm text-secondary">{notice}</p>}

            <section className="grid gap-4">
              {queue.map((review) => (
                <article key={review.id} className="rounded-lg border border-outline-variant bg-surface-container p-6">
                  <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-semibold text-secondary">
                          {review.priority}
                        </span>
                        <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold">
                          {review.status}
                        </span>
                      </div>
                      <h2 className="mt-4 text-2xl font-semibold">Listing {review.listing_id || review.listingId || 'pending assignment'}</h2>
                      <p className="mt-2 text-on-surface-variant">
                        {review.reviewer_notes || review.reviewerNotes || 'No reviewer notes yet.'}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {(review.reason_codes || review.reasonCodes || []).map((code) => (
                          <span key={code} className="rounded-full bg-error/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-error">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => decide(review, 'approve')} className="btn-primary">
                        Approve
                      </button>
                      <button onClick={() => decide(review, 'block')} className="rounded-md bg-error/10 px-4 py-2 font-bold text-error">
                        Block
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {queue.length === 0 && (
                <div className="rounded-lg border border-dashed border-outline-variant p-12 text-center text-on-surface-variant">
                  No moderation items for this filter.
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
