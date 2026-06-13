import { useEffect, useRef, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { fetchDocuments, saveDocument } from '../services/documents-service'
import { uploadDocument } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

function VaultContent() {
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

  const statusColor = {
    verified: 'bg-green-100 text-green-800',
    uploaded: 'bg-brand-light text-brand-dark',
    pending_signature: 'bg-brand-light text-brand-dark',
    draft: 'bg-surface-subtle text-ink-secondary',
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Document vault</h1>
      <p className="mt-1 text-ink-secondary">Titles, offers, licenses, and inspection reports.</p>

      <div className="mt-8 overflow-hidden rounded-card border border-surface-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Document</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-secondary">No documents yet</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-3 font-medium">{doc.name}</td>
                  <td className="px-4 py-3 text-ink-secondary">{doc.category || doc.property || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[doc.status] || statusColor.draft}`}>
                      {(doc.status || 'draft').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">{doc.updated || doc.created_at?.slice?.(0, 10) || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleUpload} />
      <button
        type="button"
        disabled={uploading || !user}
        onClick={() => fileRef.current?.click()}
        className="mt-4 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand disabled:opacity-60"
      >
        {uploading ? 'Uploading…' : 'Upload document'}
      </button>
    </DesktopShell>
  )
}

export default function DocumentVaultPage() {
  return <ProtectedRoute><VaultContent /></ProtectedRoute>
}
