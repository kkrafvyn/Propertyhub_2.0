import { useEffect, useMemo, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchSmartDashboard } from '../../services/smart-service'
import { useTranslation } from '../../i18n/LocaleContext'

function SmartHub() {
  const { t } = useTranslation()
  const [portfolio, setPortfolio] = useState(null)

  const links = useMemo(() => [
    { to: '/smart/devices', label: t('hubs.smart.hub.links.devices.label'), desc: t('hubs.smart.hub.links.devices.desc') },
    { to: '/smart/automations', label: t('hubs.smart.hub.links.automations.label'), desc: t('hubs.smart.hub.links.automations.desc') },
    { to: '/smart/alerts', label: t('hubs.smart.hub.links.alerts.label'), desc: t('hubs.smart.hub.links.alerts.desc') },
    { to: '/smart', label: t('hubs.smart.hub.links.mobile.label'), desc: t('hubs.smart.hub.links.mobile.desc') },
  ], [t])

  useEffect(() => {
    fetchSmartDashboard().then(({ portfolio: p }) => setPortfolio(p))
  }, [])

  return (
    <SmartShell titleKey="hubs.smart.hub.title" subtitle={portfolio?.building || t('hubs.smart.hub.subtitle')}>
      {portfolio && (
        <StatGrid>
          <StatCard label={t('hubs.smart.hub.stats.devicesOnline')} value={`${portfolio.devicesOnline}/${portfolio.devicesTotal}`} />
          <StatCard label={t('hubs.smart.hub.stats.automations')} value={portfolio.automationsActive} />
          <StatCard label={t('hubs.smart.hub.stats.alertsToday')} value={portfolio.alertsToday} />
          <StatCard label={t('hubs.smart.hub.stats.energyToday')} value={portfolio.energyToday} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </SmartShell>
  )
}

export default function SmartHubPage() {
  return <ProtectedRoute><SmartHub /></ProtectedRoute>
}
