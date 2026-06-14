import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchTenants } from '../../services/pms-service'

function Tenants() {
  const [tenants, setTenants] = useState([])

  useEffect(() => {
    fetchTenants().then(({ tenants: rows }) => setTenants(rows))
  }, [])

  return (
    <ManageShell titleKey="hubs.manage.tenants.title" subtitleKey="hubs.manage.tenants.subtitle">
      <div className="overflow-hidden panel-card bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-surface-border bg-surface-subtle">
            <tr>
              <th className="px-4 py-3 font-semibold">Tenant</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">Rent</th>
              <th className="px-4 py-3 font-semibold">Lease end</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-surface-border last:border-0">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3">{t.unit}</td>
                <td className="px-4 py-3">GHS {t.rent.toLocaleString()}</td>
                <td className="px-4 py-3 text-ink-secondary">{t.leaseEnd}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{t.status}</span>
                </td>
                <td className="px-4 py-3">{t.balance ? `GHS ${t.balance.toLocaleString()}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="mt-4 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">Add tenant</button>
    </ManageShell>
  )
}

export default function ManageTenantsPage() {
  return <ProtectedRoute><Tenants /></ProtectedRoute>
}
