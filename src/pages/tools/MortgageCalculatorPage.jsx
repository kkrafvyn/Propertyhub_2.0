import { useMemo, useState } from 'react'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'

export default function MortgageCalculatorPage() {
  const [price, setPrice] = useState(2000000)
  const [down, setDown] = useState(20)
  const [rate, setRate] = useState(18)
  const [years, setYears] = useState(20)

  const result = useMemo(() => {
    const principal = price * (1 - down / 100)
    const monthlyRate = rate / 100 / 12
    const n = years * 12
    const payment = monthlyRate === 0
      ? principal / n
      : (principal * monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1)
    return {
      principal,
      monthly: payment,
      total: payment * n,
    }
  }, [price, down, rate, years])

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Mortgage estimator</h1>
      <p className="mt-1 text-ink-secondary">Estimate monthly payments for Ghana property purchases.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <Slider label="Property price (GHS)" value={price} onChange={setPrice} min={100000} max={10000000} step={50000} />
          <Slider label="Down payment (%)" value={down} onChange={setDown} min={5} max={50} step={1} />
          <Slider label="Interest rate (%)" value={rate} onChange={setRate} min={10} max={30} step={0.5} />
          <Slider label="Term (years)" value={years} onChange={setYears} min={5} max={30} step={1} />
        </div>
        <div className="rounded-card border border-surface-border bg-brand-light p-6">
          <p className="text-sm text-brand-dark/70">Estimated monthly payment</p>
          <p className="mt-2 text-4xl font-bold text-brand-dark">GHS {Math.round(result.monthly).toLocaleString()}</p>
          <div className="mt-6 space-y-2 text-sm text-brand-dark/80">
            <p>Loan amount: GHS {Math.round(result.principal).toLocaleString()}</p>
            <p>Total paid: GHS {Math.round(result.total).toLocaleString()}</p>
          </div>
        </div>
      </div>
    </DesktopShell>
  )
}

function Slider({ label, value, onChange, min, max, step }) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span>{typeof value === 'number' && value > 1000 ? value.toLocaleString() : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full" />
    </label>
  )
}
