import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchBranches, addBranch } from '../../services/agency-service'

function Branches() {
  const { t } = useTranslation()
  const [branches, setBranches] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', location: '', manager: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBranches().then(({ branches: rows }) => setBranches(rows))
  }, [])

  async function handleAdd() {
    if (!form.name.trim() || !form.location.trim()) return
    setLoading(true)
    const result = await addBranch(form)
    if (result?.branch) setBranches((prev) => [...prev, result.branch])
    setShowForm(false)
    setForm({ name: '', location: '', manager: '' })
    setLoading(false)
  }

  return (
    <AgencyShell titleKey="hubs.agency.branches.title" subtitleKey="hubs.agency.branches.subtitle">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => (
          <article key={b.id} className="panel-card bg-surface p-5">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold">{b.name}</h2>
              <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{b.status}</span>
            </div>
            <p className="mt-1 text-sm text-ink-secondary">{b.location}</p>
            <p className="mt-3 text-sm">Manager: <span className="font-medium">{b.manager}</span></p>
            <div className="mt-3 flex gap-4 text-sm text-ink-secondary">
              <span>{b.agents} agents</span>
              <span>{b.listings} listings</span>
            </div>
          </article>
        ))}
      </div>
      <button type="button" onClick={() => setShowForm(true)} className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
        {t('hubs.modals.addBranch.title')}
      </button>

      {showForm && (
        <QuickFormModal title={t('hubs.modals.addBranch.title')} onClose={() => setShowForm(false)} onSubmit={handleAdd} submitLabel={t('hubs.modals.addBranch.submit')} loading={loading}>
          <ModalField label="Branch name">
            <input className={modalInputClassName()} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </ModalField>
          <ModalField label="Location">
            <input className={modalInputClassName()} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </ModalField>
          <ModalField label="Manager">
            <input className={modalInputClassName()} value={form.manager} onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))} />
          </ModalField>
        </QuickFormModal>
      )}
    </AgencyShell>
  )
}

export default function AgencyBranchesPage() {
  return <ProtectedRoute><Branches /></ProtectedRoute>
}
