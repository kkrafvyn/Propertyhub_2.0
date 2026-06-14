import { useEffect, useState } from 'react'
import FinanceShell from '../../components/FinanceShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, PanelCard, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchFinanceDashboard } from '../../services/finance-service'
import { rentCollectionRails } from '../../data/finance'

const links = [
  { to: '/finance/mortgages', label: 'Mortgage marketplace', desc: 'Partner banks and pre-qualification' },
  { to: '/finance/escrow', label: 'Escrow platform', desc: 'Secure transaction deposits' },
  { to: '/finance/rent-collection', label: 'Rent collection', desc: 'Paystack & Stripe payment rails' },
  { to: '/finance/insurance', label: 'Insurance marketplace', desc: 'Home, landlord, and tenant cover' },
  { to: '/finance/commissions', label: 'Commission settlement', desc: 'Agent payout automation' },
  { to: '/tools/mortgage', label: 'Mortgage calculator', desc: 'Estimate monthly payments' },
]

function FinanceHub() {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    fetchFinanceDashboard().then(({ summary: s }) => setSummary(s))
  }, [])

  return (
    <FinanceShell titleKey="hubs.finance.hub.title" subtitleKey="hubs.finance.hub.subtitle">
      {summary && (
        <StatGrid cols={3}>
          <StatCard label="Escrow funded" value={`GHS ${summary.escrowTotal?.toLocaleString()}`} />
          <StatCard label="Pending commissions" value={summary.pendingCommissions} />
          <StatCard label="Mortgage partners" value={summary.mortgagePartners} />
        </StatGrid>
      )}

      <div className="mb-8">
        <PanelCard title="Payment providers">
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
