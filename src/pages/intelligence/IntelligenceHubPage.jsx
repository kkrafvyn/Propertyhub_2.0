import { useEffect, useState } from 'react'
import IntelligenceShell from '../../components/IntelligenceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchIntelligenceDashboard } from '../../services/intelligence-service'
import { useTranslation } from '../../i18n/LocaleContext'

function Hub() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)

  const links = [
    { to: '/intelligence/market', label: t('workspace.nav.marketData'), desc: t('hubs.intelligence.marketIntelligence.title') },
    { to: '/intelligence/heatmap', label: t('hubs.intelligence.heatmap.title'), desc: t('hubs.intelligence.heatmap.subtitle') },
    { to: '/intelligence/valuation', label: t('hubs.intelligence.valuationEngine.title'), desc: t('hubs.intelligence.valuationEngine.subtitle') },
    { to: '/neighborhoods', label: t('buyerHub.links.neighborhoods.label'), desc: t('buyerHub.links.neighborhoods.desc') },
    { to: '/tools/investment', label: t('comparePage.investmentCalculator'), desc: t('buyerHub.links.compare.desc') },
  ]

  useEffect(() => {
    fetchIntelligenceDashboard().then(({ summary: s }) => setSummary(s))
  }, [])

  return (
    <IntelligenceShell titleKey="hubs.intelligence.hub.title" subtitleKey="hubs.intelligence.hub.subtitle">
      {summary && (
        <StatGrid>
          <StatCard label={t('hubs.intelligence.hub.stats.medianPrice')} value={`GHS ${(summary.medianPrice / 1000000).toFixed(2)}M`} />
          <StatCard label={t('hubs.intelligence.hub.stats.yoyChange')} value={summary.priceChangeYoY} />
          <StatCard label={t('hubs.intelligence.hub.stats.avgDaysOnMarket')} value={summary.avgDaysOnMarket} />
          <StatCard label={t('hubs.intelligence.hub.stats.transactions6mo')} value={summary.transactionVolume} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </IntelligenceShell>
  )
}

export default function IntelligenceHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}
