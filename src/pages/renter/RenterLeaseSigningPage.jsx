import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchLeaseDocuments, signLeaseDocument } from '../../services/renter-service'
import { createSigningSession } from '../../services/docusign-service'

function LeaseSigning() {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState([])
  const [signing, setSigning] = useState(null)

  useEffect(() => {
    fetchLeaseDocuments().then(({ documents: rows }) => setDocuments(rows))
  }, [])

  async function handleSign(doc) {
    setSigning(doc.id)
    const session = await createSigningSession(doc.id, doc.name)
    if (session.signingUrl && !session.demo) {
      window.open(session.signingUrl, '_blank', 'noopener,noreferrer')
    } else {
      await signLeaseDocument(doc.id)
      setDocuments((prev) => prev.map((d) => (
        d.id === doc.id ? { ...d, status: 'signed', signedAt: new Date().toISOString().slice(0, 10) } : d
      )))
    }
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
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-200">Signed</span>
            ) : (
              <button
                type="button"
                onClick={() => handleSign(doc)}
                disabled={signing === doc.id}
                className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {signing === doc.id ? t('extensions.docusign.signing') : t('extensions.docusign.signViaDocusign')}
              </button>
            )}
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm text-ink-secondary">{t('extensions.docusign.legalNote')}</p>
    </RenterShell>
  )
}

export default function RenterLeaseSigningPage() {
  return <ProtectedRoute><LeaseSigning /></ProtectedRoute>
}
