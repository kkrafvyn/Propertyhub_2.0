import { useEffect, useState } from 'react'
import ManageShell from '../../components/ManageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchRentCollection } from '../../services/pms-service'

function Finance() {
  const [collection, setCollection] = useState([])
  const [expenses, setExpenses] = useState([])

  useEffect(() => {
    fetchRentCollection().then(({ collection: c, expenses: e }) => {
      setCollection(c)
      setExpenses(e)
    })
  }, [])

  const collected = collection.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0)
  const outstanding = collection.filter((c) => c.status !== 'paid').reduce((s, c) => s + c.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <ManageShell titleKey="hubs.manage.finance.title" subtitleKey="hubs.manage.finance.subtitle">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Collected" value={`GHS ${collected.toLocaleString()}`} />
        <Stat label="Outstanding" value={`GHS ${outstanding.toLocaleString()}`} />
        <Stat label="Expenses MTD" value={`GHS ${totalExpenses.toLocaleString()}`} />
      </div>

      <h3 className="mb-3 font-semibold">Rent collection</h3>
      <div className="space-y-2">
        {collection.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
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

      <h3 className="mb-3 mt-8 font-semibold">Recent expenses</h3>
      <div className="space-y-2">
        {expenses.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface px-4 py-3 text-sm">
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
