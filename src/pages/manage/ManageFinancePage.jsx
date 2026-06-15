import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchRentCollection, fetchLandlordArrears } from '../../services/pms-service'
import { generateMonthlyBills } from '../../services/utility-service'

function Finance() {
  const [collection, setCollection] = useState([])
  const [expenses, setExpenses] = useState([])
  const [utilityBills, setUtilityBills] = useState([])
  const [utilityArrears, setUtilityArrears] = useState(0)
  const [arrearsSummary, setArrearsSummary] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchRentCollection().then(({ collection: c, expenses: e, utilityBills: ub, utilityArrears: ua }) => {
      setCollection(c ?? [])
      setExpenses(e ?? [])
      setUtilityBills(ub ?? [])
      setUtilityArrears(ua ?? 0)
    })
    fetchLandlordArrears().then(({ summary }) => setArrearsSummary(summary))
  }, [])

  async function handleRunBilling() {
    setLoading(true)
    setMessage('')
    try {
      const result = await generateMonthlyBills()
      setMessage(`Generated ${result.count ?? 0} utility bill(s).`)
    } catch (err) {
      setMessage(err.message || 'Billing run failed.')
    }
    setLoading(false)
  }

  const collected = collection.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0)
  const outstanding = collection.filter((c) => c.status !== 'paid').reduce((s, c) => s + c.amount, 0)

  return (
    <ManageShell titleKey="hubs.manage.finance.title" subtitleKey="hubs.manage.finance.subtitle">
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm">{message}</p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Rent collected" value={`GHS ${collected.toLocaleString()}`} />
        <Stat label="Rent outstanding" value={`GHS ${outstanding.toLocaleString()}`} />
        <Stat label="Utility arrears" value={`GHS ${(arrearsSummary?.utilityArrears ?? utilityArrears).toLocaleString()}`} />
        <Stat label="Total arrears" value={`GHS ${(arrearsSummary?.totalArrears ?? outstanding + utilityArrears).toLocaleString()}`} />
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRunBilling}
          disabled={loading}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Run utility billing
        </button>
        <a href="/manage/utilities" className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold">
          Utility config
        </a>
      </div>

      <h3 className="mb-3 font-semibold">Rent collection</h3>
      <div className="space-y-2">
        {collection.map((c) => (
          <div key={c.id ?? `${c.unit}-${c.tenant}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
            <span>{c.unit} · {c.tenant}</span>
            <div className="flex items-center gap-3">
              <span className="font-semibold">GHS {c.amount.toLocaleString()}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                c.status === 'paid' ? 'bg-green-100 text-green-800' : c.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
              }`}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>

      {utilityBills.length > 0 && (
        <>
          <h3 className="mb-3 mt-8 font-semibold">Unpaid utility bills</h3>
          <div className="space-y-2">
            {utilityBills.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
                <span>{b.provider_name ?? b.utility_type} · {b.billing_month}</span>
                <span className="font-semibold">GHS {Number(b.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="mb-3 mt-8 font-semibold">Recent expenses</h3>
      <div className="space-y-2">
        {expenses.map((e) => (
          <div key={e.id ?? e.category} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
            <span>{e.category} · {e.description}</span>
            <span className="font-semibold text-ink">GHS {e.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </ManageShell>
  )
}

function Stat({ label, value }) {
  return (
    <div className="panel-card bg-surface p-4">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
    </div>
  )
}

export default function ManageFinancePage() {
  return <ProtectedRoute><Finance /></ProtectedRoute>
}
