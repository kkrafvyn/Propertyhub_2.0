import { useEffect, useMemo, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchEnterpriseDashboard } from '../../services/enterprise-service'
import { useTranslation } from '../../i18n/LocaleContext'

function Hub() {
  const { t } = useTranslation()
  const [org, setOrg] = useState(null)

  const links = useMemo(() => [
    { to: '/enterprise/portfolios', label: t('hubs.enterprise.portfolios.title'), desc: t('hubs.enterprise.portfolios.subtitle') },
    { to: '/enterprise/esg', label: t('hubs.enterprise.esg.title'), desc: t('workspace.nav.esgReporting') },
    { to: '/enterprise/forecast', label: t('hubs.enterprise.forecast.title'), desc: t('hubs.enterprise.forecast.subtitle') },
  ], [t])

  useEffect(() => {
    fetchEnterpriseDashboard().then(({ org: o }) => setOrg(o))
  }, [])

  return (
    <EnterpriseShell titleKey="hubs.enterprise.hub.title" subtitle={org?.name || t('hubs.enterprise.hub.subtitle')}>
      {org && (
        <StatGrid>
          <StatCard label={t('hubs.enterprise.hub.stats.countries')} value={org.countries} />
          <StatCard label={t('hubs.enterprise.hub.stats.assets')} value={org.assets} />
          <StatCard label={t('hubs.enterprise.hub.stats.aum')} value={org.aum} />
          <StatCard label={t('hubs.enterprise.hub.stats.occupancy')} value={org.occupancy} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </EnterpriseShell>
  )
}

export default function EnterpriseHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}
