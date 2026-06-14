import { useEffect, useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, PanelCard, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchFinanceDashboard } from '../../services/finance-service'
import { rentCollectionRails } from '../../data/finance'

function FinanceHub() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetchFinanceDashboard().then(({ summary: s }) => setSummary(s))
  }, [])

  const links = [
    { to: '/finance/mortgages', label: t('hubs.finance.mortgageMarketplace.title'), desc: t('hubs.finance.mortgageMarketplace.subtitle') },
    { to: '/finance/escrow', label: t('hubs.finance.escrow.title'), desc: t('hubs.finance.escrow.subtitle') },
    { to: '/finance/rent-collection', label: t('hubs.finance.rentCollection.title'), desc: t('hubs.finance.rentCollection.subtitle') },
    { to: '/finance/insurance', label: t('hubs.finance.insurance.title'), desc: t('hubs.finance.insurance.subtitle') },
    { to: '/finance/commissions', label: t('hubs.finance.commissionSettlement.title'), desc: t('hubs.finance.commissionSettlement.subtitle') },
    { to: '/tools/mortgage', label: t('hubs.finance.mortgageCalculator.title'), desc: t('hubs.finance.mortgageCalculator.subtitle') },
  ]

  return (
    <FinanceShell titleKey="hubs.finance.hub.title" subtitleKey="hubs.finance.hub.subtitle">
      {summary && (
        <StatGrid cols={3}>
          <StatCard label={t('hubs.finance.hub.stats.escrowFunded')} value={`GHS ${summary.escrowTotal?.toLocaleString()}`} />
          <StatCard label={t('hubs.finance.hub.stats.pendingCommissions')} value={summary.pendingCommissions} />
          <StatCard label={t('hubs.finance.hub.stats.mortgagePartners')} value={summary.mortgagePartners} />
        </StatGrid>
      )}

      <div className="mb-8">
        <PanelCard title={t('panels.paymentProviders')}>
          <div className="flex flex-wrap gap-4 text-sm text-ink-secondary">
            <span>{rentCollectionRails.paystack.label} — {rentCollectionRails.paystack.methods.join(', ')}</span>
            <span>{rentCollectionRails.stripe.label} — {rentCollectionRails.stripe.methods.join(', ')}</span>
          </div>
        </PanelCard>
      </div>

      <HubLinkGrid links={links} />
    </FinanceShell>
  )
}

export default function FinanceHubPage() {
  return <ProtectedRoute><FinanceHub /></ProtectedRoute>
}
