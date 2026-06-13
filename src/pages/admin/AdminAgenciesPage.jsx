import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAdminOverview } from '../../services/admin-service'

export default function AdminAgenciesPage() {
  const [agencies, setAgencies] = useState([])

  useEffect(() => {
    fetchAdminOverview().then((d) => setAgencies(d.pendingAgencies))
  }, [])

  return (
    <ProtectedRoute>
      <AdminShell title="Agency verification" subtitle="Review and approve new agencies">
        <div className="space-y-3">
          {agencies.map((agency) => (
            <article key={agency.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-semibold">{agency.name}</p>
                <p className="text-sm text-white/70">License {agency.license} · {agency.submitted}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-dark">Approve</button>
                <button type="button" className="rounded-lg border border-white/20 px-4 py-2 text-sm">Reject</button>
              </div>
            </article>
          ))}
        </div>
      </AdminShell>
    </ProtectedRoute>
  )
}
