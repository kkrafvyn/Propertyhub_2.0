import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import QuickFormModal, { ModalField, modalInputClassName } from '../../components/ui/QuickFormModal'
import { fetchTenants, createTenant } from '../../services/pms-service'

function riskTone(band) {
  if (!band) return 'bg-surface-hover text-ink-secondary'
  if (band === 'approved') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
  if (band === 'elevated' || band === 'high_risk') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
}

function Tenants() {
  const [tenants, setTenants] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', unit: '', rent: '', leaseEnd: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTenants().then(({ tenants: rows }) => setTenants(rows))
  }, [])

  async function handleAdd() {
    if (!form.name.trim() || !form.unit.trim()) return
    setLoading(true)
    const result = await createTenant(form)
    if (result?.tenant) setTenants((prev) => [...prev, result.tenant])
    setShowForm(false)
    setForm({ name: '', unit: '', rent: '', leaseEnd: '' })
    setLoading(false)
  }

  return (
    <ManageShell titleKey="hubs.manage.tenants.title" subtitleKey="hubs.manage.tenants.subtitle">
      <p className="mb-4 text-sm text-ink-secondary">
        Credit score and risk band appear when a tenant is linked to their platform account — use this at lease approval.
      </p>
      <div className="overflow-hidden panel-card bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Tenant</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">Rent</th>
              <th className="px-4 py-3 font-semibold">Credit</th>
              <th className="px-4 py-3 font-semibold">Risk band</th>
              <th className="px-4 py-3 font-semibold">Deposit ×</th>
              <th className="px-4 py-3 font-semibold">Lease end</th>
              <th className="px-4 py-3 font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">{t.unit}</td>
                <td className="px-4 py-3">GHS {t.rent.toLocaleString()}</td>
                <td className="px-4 py-3">{t.creditScore ?? '—'}</td>
                <td className="px-4 py-3">
                  {t.riskBand ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${riskTone(t.riskBand)}`}>
                      {t.riskBand.replace(/_/g, ' ')}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">{t.depositMultiplier != null ? `${t.depositMultiplier}×` : '—'}</td>
                <td className="px-4 py-3 text-ink-secondary">{t.leaseEnd}</td>
                <td className="px-4 py-3">{t.balance ? `GHS ${t.balance.toLocaleString()}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => setShowForm(true)} className="mt-4 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">Add tenant</button>

      {showForm && (
        <QuickFormModal title="Add tenant" onClose={() => setShowForm(false)} onSubmit={handleAdd} submitLabel="Add tenant" loading={loading}>
          <ModalField label="Name">
            <input className={modalInputClassName()} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </ModalField>
          <ModalField label="Unit">
            <input className={modalInputClassName()} value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
          </ModalField>
          <ModalField label="Monthly rent (GHS)">
            <input type="number" className={modalInputClassName()} value={form.rent} onChange={(e) => setForm((f) => ({ ...f, rent: e.target.value }))} />
          </ModalField>
          <ModalField label="Lease end">
            <input type="date" className={modalInputClassName()} value={form.leaseEnd} onChange={(e) => setForm((f) => ({ ...f, leaseEnd: e.target.value }))} />
          </ModalField>
        </QuickFormModal>
      )}
    </ManageShell>
  )
}

export default function ManageTenantsPage() {
  return <ProtectedRoute><Tenants /></ProtectedRoute>
}
