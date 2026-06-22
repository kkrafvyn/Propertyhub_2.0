import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchKycDocuments, fetchKycQueue, updateKycStatus } from '../../services/trust-service'

const statusStyles = {
  verified: 'bg-green-500/20 text-green-300',
  pending_review: 'bg-surface-hover text-ink',
  pending_provider: 'bg-amber-500/20 text-amber-200',
  rejected: 'bg-red-500/20 text-red-300',
  flagged: 'bg-red-500/20 text-red-300',
}

function Kyc() {
  const [kyc, setKyc] = useState([])
  const [docsById, setDocsById] = useState({})
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    fetchKycQueue().then(({ kyc: rows }) => setKyc(rows))
  }, [])

  async function handleVerify(id) {
    await updateKycStatus(id, 'verified')
    setKyc((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'verified', rejection_reason: null } : item)))
  }

  async function handleReject(id) {
    const reason = rejectReason.trim() || 'Documents could not be verified'
    await updateKycStatus(id, 'rejected', reason)
    setKyc((prev) => prev.map((item) => (
      item.id === id ? { ...item, status: 'rejected', rejection_reason: reason } : item
    )))
    setRejectingId(null)
    setRejectReason('')
  }

  async function loadDocuments(id) {
    if (docsById[id]) return
    const { documents } = await fetchKycDocuments(id)
    setDocsById((prev) => ({ ...prev, [id]: documents ?? [] }))
  }

  return (
    <AdminShell titleKey="hubs.admin.kyc.title" subtitleKey="hubs.admin.kyc.subtitle">
      <div className="space-y-3">
        {kyc.map((item) => (
          <article key={item.id} className="panel-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{item.entity || item.name}</p>
                <p className="text-sm text-ink-secondary capitalize">
                  {item.type || item.entity_type}
                  {' · '}
                  {item.provider === 'smile' ? 'Smile ID' : 'Manual upload'}
                  {' · '}
                  {item.documents} documents
                </p>
                {item.provider_job_id && (
                  <p className="mt-1 text-xs text-ink-secondary">Job: {item.provider_job_id}</p>
                )}
                {item.rejection_reason && (
                  <p className="mt-2 text-sm text-red-300">{item.rejection_reason}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[item.status] || statusStyles.pending_review}`}>
                  {item.status.replace(/_/g, ' ')}
                </span>
                {item.status !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => handleVerify(item.id)}
                    className="rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    Verify
                  </button>
                )}
                {item.status !== 'rejected' && item.status !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => setRejectingId(item.id)}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    Reject
                  </button>
                )}
                {(item.document_paths?.length > 0 || item.documents > 0) && (
                  <button
                    type="button"
                    onClick={() => loadDocuments(item.id)}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold text-ink"
                  >
                    View docs
                  </button>
                )}
              </div>
            </div>

            {rejectingId === item.id && (
              <div className="mt-4 space-y-2 border-t border-surface-border pt-4">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason (optional)"
                  className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReject(item.id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Confirm reject
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectingId(null); setRejectReason('') }}
                    className="rounded-lg border border-surface-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {docsById[item.id]?.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-surface-border pt-3 text-sm">
                {docsById[item.id].map((doc) => (
                  <li key={doc.path}>
                    {doc.url ? (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-accent underline">
                        {doc.path.split('/').pop()}
                      </a>
                    ) : (
                      <span className="text-ink-secondary">{doc.path}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </AdminShell>
  )
}

export default function AdminKycPage() {
  return <ProtectedRoute><Kyc /></ProtectedRoute>
}
