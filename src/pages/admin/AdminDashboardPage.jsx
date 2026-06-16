import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchAdminOverview } from '../../services/trust-service'
import { useTranslation } from '../../i18n/LocaleContext'

function AdminOverview() {
  const { t } = useTranslation()
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
        <StatCard label={t('hubs.admin.dashboard.stats.pendingAgencies')} value={data.pendingAgencies?.length ?? 0} />
        <StatCard label={t('hubs.admin.dashboard.stats.moderationQueue')} value={data.moderationQueue?.length ?? 0} />
        <StatCard label={t('hubs.admin.dashboard.stats.kycPending')} value={data.kycPending ?? 0} />
        <StatCard label={t('hubs.admin.dashboard.stats.fraudAlerts')} value={data.fraudOpen ?? 0} />
        <StatCard label={t('hubs.admin.dashboard.stats.auditEvents')} value={data.auditEvents?.length ?? 0} />
      </StatGrid>
    </AdminShell>
  )
}

export default function AdminDashboardPage() {
  return <ProtectedRoute><AdminOverview /></ProtectedRoute>
}
