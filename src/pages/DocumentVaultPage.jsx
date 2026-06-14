import { useEffect, useRef, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { Badge, PageTitle, PrimaryButton, TablePanel } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchDocuments, saveDocument } from '../services/documents-service'
import { uploadDocument } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

function VaultContent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchDocuments().then(({ documents: rows }) => setDocuments(rows))
  }, [])

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    try {
      const { path, category } = await uploadDocument(user.id, file, 'vault')
      const { document } = await saveDocument({ name: file.name, category, storage_path: path })
      if (document) setDocuments((prev) => [document, ...prev])
    } catch {
      const local = {
        id: `local-${Date.now()}`,
        name: file.name,
        category: 'vault',
        status: 'uploaded',
        property: '—',
        updated: new Date().toISOString().slice(0, 10),
      }
      setDocuments((prev) => [local, ...prev])
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const statusTone = {
    verified: 'success',
    uploaded: 'neutral',
    pending_signature: 'warning',
    draft: 'neutral',
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle
        title={t('vaultPage.title')}
        subtitle={t('vaultPage.subtitle')}
        action={
          <>
            <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleUpload} />
            <PrimaryButton disabled={uploading || !user} onClick={() => fileRef.current?.click()}>
              {uploading ? t('vaultPage.uploading') : t('vaultPage.upload')}
            </PrimaryButton>
          </>
        }
      />

      <TablePanel>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-5 py-3 font-semibold text-ink">{t('vaultPage.colDocument')}</th>
              <th className="px-5 py-3 font-semibold text-ink">{t('vaultPage.colCategory')}</th>
              <th className="px-5 py-3 font-semibold text-ink">{t('vaultPage.colStatus')}</th>
              <th className="px-5 py-3 font-semibold text-ink">{t('vaultPage.colUpdated')}</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-ink-secondary">{t('vaultPage.empty')}</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b border-surface-border last:border-0">
                  <td className="px-5 py-3.5 font-medium text-ink">{doc.name}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{doc.category || doc.property || '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={statusTone[doc.status] || 'neutral'}>
                      {(doc.status || 'draft').replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-ink-secondary">{doc.updated || doc.created_at?.slice?.(0, 10) || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </TablePanel>
    </DesktopShell>
  )
}

export default function DocumentVaultPage() {
  return <ProtectedRoute><VaultContent /></ProtectedRoute>
}
