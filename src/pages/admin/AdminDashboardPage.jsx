import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchAdminOverview } from '../../services/trust-service'

function AdminOverview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchAdminOverview().then(setData)
  }, [])

  if (!data) {
    return (
      <AdminShell titleKey="hubs.admin.dashboard.title" subtitleKey="hubs.admin.dashboard.subtitle">
        <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
      </AdminShell>
    )
  }

  return (
    <AdminShell titleKey="hubs.admin.dashboard.title" subtitleKey="hubs.admin.dashboard.loadedSubtitle">
      <StatGrid cols={5}>
        <StatCard label="Pending agencies" value={data.pendingAgencies?.length ?? 0} />
        <StatCard label="Moderation queue" value={data.moderationQueue?.length ?? 0} />
        <StatCard label="KYC pending" value={data.kycPending ?? 0} />
        <StatCard label="Fraud alerts" value={data.fraudOpen ?? 0} />
        <StatCard label="Audit events" value={data.auditEvents?.length ?? 0} />
      </StatGrid>
    </AdminShell>
  )
}

export default function AdminDashboardPage() {
  return <ProtectedRoute><AdminOverview /></ProtectedRoute>
}
