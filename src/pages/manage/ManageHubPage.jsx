import { useEffect, useMemo, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchPmsDashboard } from '../../services/pms-service'
import { useTranslation } from '../../i18n/LocaleContext'

function ManageHub() {
  const { t } = useTranslation()
  const [portfolio, setPortfolio] = useState(null)

  const links = useMemo(() => [
    { to: '/manage/tenants', label: t('workspace.nav.tenants'), desc: t('hubs.manage.tenants.subtitle') },
    { to: '/manage/applications', label: t('hubs.manage.applications.title'), desc: t('hubs.manage.applications.subtitle') },
    { to: '/vendors', label: t('workspace.nav.workOrders'), desc: t('hubs.manage.workOrders.subtitle') },
    { to: '/manage/work-orders', label: t('hubs.manage.workOrders.title'), desc: t('hubs.manage.workOrders.subtitle') },
    { to: '/manage/finance', label: t('workspace.nav.rentExpenses'), desc: t('hubs.manage.finance.subtitle') },
    { to: '/manage/utilities', label: t('hubs.renter.utilities.title'), desc: t('hubs.manage.utilities.subtitle') },
    { to: '/manage/inspections', label: t('hubs.manage.inspections.title'), desc: t('hubs.manage.inspections.subtitle') },
    { to: '/documents', label: t('profileNav.documentVault'), desc: t('vaultPage.subtitle') },
  ], [t])

  useEffect(() => {
    fetchPmsDashboard().then(({ portfolio: p }) => setPortfolio(p))
  }, [])

  return (
    <ManageShell titleKey="hubs.manage.hub.title" subtitle={portfolio?.name || t('hubs.manage.hub.subtitle')}>
      {portfolio && (
        <StatGrid>
          <StatCard label={t('hubs.manage.hub.stats.buildings')} value={portfolio.buildings} />
          <StatCard label={t('hubs.manage.hub.stats.units')} value={portfolio.units} />
          <StatCard label={t('hubs.manage.hub.stats.occupancy')} value={portfolio.occupancy} />
          <StatCard label={t('hubs.manage.hub.stats.collectedMtd')} value={`GHS ${portfolio.collectedMtd?.toLocaleString()}`} />
          {portfolio.totalArrears != null && (
            <StatCard label={t('hubs.manage.hub.stats.totalArrears')} value={`GHS ${portfolio.totalArrears.toLocaleString()}`} />
          )}
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </ManageShell>
  )
}

export default function ManageHubPage() {
  return <ProtectedRoute><ManageHub /></ProtectedRoute>
}
