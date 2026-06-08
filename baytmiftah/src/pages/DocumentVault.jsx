import React, { useEffect, useState } from 'react'
import Header from '../components/Header'
import Navigation from '../components/Navigation'
import { Badge, DataBanner, EmptyState, LoadingState } from '../components/UI'
import { documentVaultService } from '../services/product-feature-service'

const documentTypes = [
  { value: 'ownership', label: 'Ownership' },
  { value: 'agency_mandate', label: 'Agency mandate' },
  { value: 'id_verification', label: 'ID verification' },
  { value: 'inspection', label: 'Inspection' },
]

export default function DocumentVault() {
  const [documents, setDocuments] = useState([])
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({
    title: '',
    type: 'ownership',
    property: '',
    expiresAt: '',
  })

  const loadDocuments = async () => {
    setLoading(true)
    const result = await documentVaultService.listDocuments()
    setDocuments(result.documents)
    setSource(result.source)
    setLoading(false)
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  const addDocument = async (event) => {
    event.preventDefault()
    const result = await documentVaultService.addDocument(form)
    setStatus(
      result.source === 'supabase'
        ? 'Document saved through the transaction backend.'
        : 'Document staged locally until Supabase Storage and transaction tables are deployed.'
    )
    setForm({ title: '', type: 'ownership', property: '', expiresAt: '' })
    loadDocuments()
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navigation />
      <main className="pb-32 md:ml-64 md:pb-10">
        <Header title="Document Vault" showBack />
        <div className="page-shell">
          <div className="content-shell section-stack">
            <DataBanner
              variant={source === 'supabase' ? 'info' : 'warning'}
              title={source === 'supabase' ? 'Supabase vault active' : 'Local vault fallback active'}
              description="Store ownership, mandate, inspection, identity, and closing documents against each property. Supabase Storage policies finish the secure file upload side."
            />

            <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="panel">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-secondary">Verified documents</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Review expiry, property linkage, and verification status before a listing goes live.
                    </p>
                  </div>
                  <Badge variant={source === 'supabase' ? 'success' : 'warning'}>
                    {source || 'loading'}
                  </Badge>
                </div>

                {loading ? (
                  <LoadingState className="mt-6" title="Loading documents" />
                ) : documents.length ? (
                  <div className="mt-6 grid gap-3">
                    {documents.map((document) => (
                      <article key={document.id} className="panel-inset">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-on-surface">{document.title}</p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {document.property || document.property_id || 'Unassigned property'} /{' '}
                              {document.type || document.document_type || 'document'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={document.status === 'verified' ? 'success' : 'warning'}>
                              {document.status || 'pending'}
                            </Badge>
                            {document.expiresAt && <Badge variant="secondary">{document.expiresAt}</Badge>}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon="folder_managed"
                    title="No documents yet"
                    description="Add the first document package for this agency or transaction."
                  />
                )}
              </div>

              <aside className="panel">
                <h2 className="text-xl font-semibold text-secondary">Add document</h2>
                <form onSubmit={addDocument} className="mt-5 grid gap-3">
                  <input
                    className="input-field"
                    value={form.title}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Document title"
                    required
                  />
                  <select
                    className="input-field"
                    value={form.type}
                    onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                  >
                    {documentTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input-field"
                    value={form.property}
                    onChange={(event) => setForm((current) => ({ ...current, property: event.target.value }))}
                    placeholder="Property"
                    required
                  />
                  <input
                    type="date"
                    className="input-field"
                    value={form.expiresAt}
                    onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                  />
                  <button className="btn-primary justify-center">Stage document</button>
                </form>
                {status && <p className="mt-4 rounded-md bg-secondary/10 p-3 text-sm text-secondary">{status}</p>}
              </aside>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
