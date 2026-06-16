import { useEffect, useState } from 'react'
import AgencyShell from '../../components/AgencyShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchCompliance, addComplianceItem } from '../../services/agency-service'

const statusStyles = {
  compliant: 'bg-green-100 text-green-800',
  due_soon: 'bg-amber-100 text-amber-800',
  pending: 'bg-surface-subtle text-ink-secondary',
}

function normalizeItem(item) {
  if (item.item) return item
  const meta = item.metadata ?? {}
  return {
    id: item.id,
    item: meta.item ?? item.action ?? 'Compliance item',
    owner: meta.owner ?? 'Agency',
    due: meta.due ?? item.created_at?.slice?.(0, 10) ?? '—',
    status: meta.status ?? 'pending',
  }
}

function Compliance() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ item: '', owner: '', due: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCompliance().then(({ compliance }) => setItems((compliance ?? []).map(normalizeItem)))
  }, [])

  async function handleAdd() {
    if (!form.item.trim()) return
    setLoading(true)
    const result = await addComplianceItem(form)
    if (result?.item) setItems((prev) => [...prev, normalizeItem(result.item)])
    setShowForm(false)
    setForm({ item: '', owner: '', due: '' })
    setLoading(false)
  }

  return (
    <AgencyShell titleKey="hubs.agency.compliance.title" subtitleKey="hubs.agency.compliance.subtitle">
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{item.item}</p>
              <p className="text-sm text-ink-secondary">Owner: {item.owner} · Due {item.due}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[item.status] || statusStyles.pending}`}>
              {String(item.status).replace('_', ' ')}
            </span>
          </article>
        ))}
      </div>
      <button type="button" onClick={() => setShowForm(true)} className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">
        {t('hubs.modals.addComplianceItem.title')}
      </button>

      {showForm && (
        <QuickFormModal title={t('hubs.modals.addComplianceItem.title')} onClose={() => setShowForm(false)} onSubmit={handleAdd} submitLabel={t('hubs.modals.addComplianceItem.submit')} loading={loading}>
          <ModalField label="Requirement">
            <input className={modalInputClassName()} value={form.item} onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))} placeholder="License renewal" />
          </ModalField>
          <ModalField label="Owner">
            <input className={modalInputClassName()} value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
          </ModalField>
          <ModalField label="Due date">
            <input type="date" className={modalInputClassName()} value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} />
          </ModalField>
        </QuickFormModal>
      )}
    </AgencyShell>
  )
}

export default function AgencyCompliancePage() {
  return <ProtectedRoute><Compliance /></ProtectedRoute>
}
