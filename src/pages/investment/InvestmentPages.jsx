import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import InvestmentShell from '../../components/InvestmentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import CapabilityRoute from '../../components/CapabilityRoute'
import { CAPABILITIES } from '../../lib/capabilities'
import { HubLinkGrid, StatCard, StatGrid, PanelCard, PrimaryButton } from '../../components/ui/AirbnbUI'
import { fetchInvestmentDashboard, runInvestmentScenario, syncPortfolioHoldings } from '../../services/investment-service'

function InvestmentHub() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchInvestmentDashboard().then(setData)
  }, [])

  const p = data?.portfolio
  const links = [
    { to: '/investment/roi', label: 'ROI analysis', desc: 'Cap rate, cash flow, appreciation' },
    { to: '/investment/portfolio', label: 'Portfolio', desc: 'Holdings and performance' },
    { to: '/investment/deals', label: 'Deal room', desc: 'Compare acquisition targets' },
    { to: '/investment/forecast', label: 'Forecast', desc: '5-year projections' },
    { to: '/intelligence/valuation', label: 'AI valuation', desc: 'Automated property valuation' },
  ]

  return (
    <InvestmentShell title="Investment center" subtitle="Institutional-grade analysis for individual investors">
      {p && (
        <StatGrid cols={3}>
          <StatCard label="Portfolio" value={p.name} />
          <StatCard label="Holdings" value={p.holdings} />
          <StatCard label="Total value" value={`GHS ${p.totalValue?.toLocaleString()}`} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </InvestmentShell>
  )
}

function RoiContent() {
  const [result, setResult] = useState(null)
  const [price, setPrice] = useState(850000)
  const [rent, setRent] = useState(5500)

  async function calculate() {
    const { projections } = await runInvestmentScenario({
      listingId: 'demo',
      assumptions: { price, monthlyRent: rent },
    })
    setResult(projections)
  }

  return (
    <InvestmentShell title="ROI analysis" subtitle="Cap rate, cash flow, and appreciation">
      <PanelCard title="Scenario inputs">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Purchase price (GHS)
            <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2" />
          </label>
          <label className="text-sm">Monthly rent (GHS)
            <input type="number" value={rent} onChange={(e) => setRent(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-surface-border px-3 py-2" />
          </label>
        </div>
        <PrimaryButton className="mt-4" onClick={calculate}>Calculate</PrimaryButton>
        {result && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Cap rate" value={`${result.capRate}%`} />
            <StatCard label="Annual cash flow" value={`GHS ${result.annualCashFlow?.toLocaleString()}`} />
            <StatCard label="5yr value est." value={`GHS ${Number(result.fiveYearAppreciation).toLocaleString()}`} />
          </div>
        )}
      </PanelCard>
    </InvestmentShell>
  )
}

function PortfolioContent() {
  const [holdings, setHoldings] = useState([])
  const [syncMsg, setSyncMsg] = useState('')

  function reload() {
    fetchInvestmentDashboard().then(({ holdings: h }) => setHoldings(h ?? []))
  }

  useEffect(() => { reload() }, [])

  async function handleSync() {
    const result = await syncPortfolioHoldings()
    setSyncMsg(`Synced ${result?.holdings_added ?? 0} holdings from completed transactions.`)
    reload()
  }

  return (
    <InvestmentShell title="Portfolio" subtitle="Track owned and watched assets">
      <PanelCard title="Holdings">
        <PrimaryButton className="mb-4" onClick={handleSync}>Sync from completed purchases</PrimaryButton>
        {syncMsg && <p className="mb-3 text-sm text-ink-secondary">{syncMsg}</p>}
        <ul className="divide-y divide-surface-border">
          {holdings.map((h) => (
            <li key={h.id} className="flex justify-between py-3 text-sm">
              <span>{h.asset_ref ?? h.listing_id}</span>
              <span>GHS {Number(h.cost_basis).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </InvestmentShell>
  )
}

function DealsContent() {
  return (
    <InvestmentShell title="Deal room" subtitle="Compare acquisition opportunities">
      <PanelCard title="Active deals">
        <p className="text-sm text-ink-secondary">Save listings to compare cap rates and financing scenarios side by side.</p>
        <PrimaryButton as={Link} to="/compare" className="mt-4">Open compare tool</PrimaryButton>
      </PanelCard>
    </InvestmentShell>
  )
}

function ForecastContent() {
  return (
    <InvestmentShell title="Forecast" subtitle="Appreciation and cash flow projections">
      <PanelCard title="Market outlook">
        <p className="text-sm text-ink-secondary">Powered by intelligence module market trends and AI valuation models.</p>
        <PrimaryButton as={Link} to="/intelligence/market" className="mt-4">View market data</PrimaryButton>
      </PanelCard>
    </InvestmentShell>
  )
}

function withInvest(Page) {
  return function Wrapped() {
    return (
      <CapabilityRoute require={CAPABILITIES.INVEST}>
        <Page />
      </CapabilityRoute>
    )
  }
}

export function InvestmentHubPage() {
  return <ProtectedRoute><InvestmentHub /></ProtectedRoute>
}

export const InvestmentRoiPage = withInvest(RoiContent)
export const InvestmentPortfolioPage = withInvest(PortfolioContent)
export const InvestmentDealsPage = withInvest(DealsContent)
export const InvestmentForecastPage = withInvest(ForecastContent)
