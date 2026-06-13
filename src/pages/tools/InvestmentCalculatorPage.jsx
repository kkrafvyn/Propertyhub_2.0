import { useMemo, useState } from 'react'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'

export default function InvestmentCalculatorPage() {
  const [price, setPrice] = useState(1500000)
  const [rent, setRent] = useState(8500)
  const [expenses, setExpenses] = useState(15)
  const [appreciation, setAppreciation] = useState(6)

  const result = useMemo(() => {
    const annualRent = rent * 12
    const netRent = annualRent * (1 - expenses / 100)
    const capRate = (netRent / price) * 100
    const futureValue = price * (1 + appreciation / 100) ** 5
    const roi = ((futureValue - price + netRent * 5) / price) * 100
    return { capRate, netRent, futureValue, roi }
  }, [price, rent, expenses, appreciation])

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Investment calculator</h1>
      <p className="mt-1 text-ink-secondary">Cap rate, cash flow, and 5-year ROI projections.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Input label="Purchase price (GHS)" value={price} onChange={setPrice} />
          <Input label="Monthly rent (GHS)" value={rent} onChange={setRent} />
          <Input label="Expense ratio (%)" value={expenses} onChange={setExpenses} />
          <Input label="Annual appreciation (%)" value={appreciation} onChange={setAppreciation} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Metric label="Cap rate" value={`${result.capRate.toFixed(2)}%`} />
          <Metric label="Net annual rent" value={`GHS ${Math.round(result.netRent).toLocaleString()}`} />
          <Metric label="5yr projected value" value={`GHS ${Math.round(result.futureValue).toLocaleString()}`} />
          <Metric label="5yr ROI" value={`${result.roi.toFixed(1)}%`} />
        </div>
      </div>
    </DesktopShell>
  )
}

function Input({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-surface-border px-4 py-3" />
    </label>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-4">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}
