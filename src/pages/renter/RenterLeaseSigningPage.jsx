import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchLeaseDocuments, signLeaseDocument } from '../../services/renter-service'

function LeaseSigning() {
  const [documents, setDocuments] = useState([])
  const [signing, setSigning] = useState(null)

  useEffect(() => {
    fetchLeaseDocuments().then(({ documents: rows }) => setDocuments(rows))
  }, [])

  async function handleSign(id) {
    setSigning(id)
    await signLeaseDocument(id)
    setDocuments((prev) => prev.map((d) => (
      d.id === id ? { ...d, status: 'signed', signedAt: new Date().toISOString().slice(0, 10) } : d
    )))
    setSigning(null)
  }

  return (
    <RenterShell titleKey="hubs.renter.leaseSigning.title" subtitleKey="hubs.renter.leaseSigning.subtitle">
      <div className="space-y-3">
        {documents.map((doc) => (
          <article key={doc.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{doc.name}</p>
              {doc.signedAt && <p className="text-sm text-ink-secondary">Signed {doc.signedAt}</p>}
            </div>
            {doc.status === 'signed' ? (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Signed</span>
            ) : (
              <button
                type="button"
                onClick={() => handleSign(doc.id)}
                disabled={signing === doc.id}
                className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {signing === doc.id ? 'Signing…' : 'Sign document'}
              </button>
            )}
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-secondary">E-signatures are legally binding under Ghana&apos;s Electronic Transactions Act.</p>
    </RenterShell>
  )
}

export default function RenterLeaseSigningPage() {
  return <ProtectedRoute><LeaseSigning /></ProtectedRoute>
}
