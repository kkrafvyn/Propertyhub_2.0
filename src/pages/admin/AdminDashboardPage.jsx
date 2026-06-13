import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAdminOverview } from '../../services/trust-service'

function AdminOverview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchAdminOverview().then(setData)
  }, [])

  if (!data) return <AdminShell title="Overview"><p>Loading…</p></AdminShell>

  return (
    <AdminShell title="Platform overview" subtitle="Trust, verification, AI, and global operations">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card label="Pending agencies" value={data.pendingAgencies?.length ?? 0} />
        <Card label="Moderation queue" value={data.moderationQueue?.length ?? 0} />
        <Card label="KYC pending" value={data.kycPending ?? 0} />
        <Card label="Fraud alerts" value={data.fraudOpen ?? 0} />
        <Card label="Audit events" value={data.auditEvents?.length ?? 0} />
      </div>
    </AdminShell>
  )
}

function Card({ label, value }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/70">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-brand">{value}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  return <ProtectedRoute><AdminOverview /></ProtectedRoute>
}
