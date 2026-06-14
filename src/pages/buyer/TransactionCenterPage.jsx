import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchTransactions } from '../../services/transaction-service'

function TransactionCenter() {
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    fetchTransactions().then(({ transactions: rows }) => setTransactions(rows))
  }, [])

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Transaction center</h1>
      <p className="mt-1 text-ink-secondary">Track offers, negotiations, and closing checklist.</p>

      <div className="mt-8 space-y-6">
        {transactions.map((tx) => (
          <article key={tx.id} className="panel-card bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">{tx.stage}</p>
                <h2 className="mt-1 text-lg font-semibold">{tx.property}</h2>
                <p className="mt-1 text-sm text-ink-secondary">
                  Offer: {tx.offer}
                  {tx.counter && ` · Counter: ${tx.counter}`}
                </p>
              </div>
              {tx.closingDate && (
                <p className="text-sm text-ink-secondary">Target close: {tx.closingDate}</p>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold">Closing checklist</p>
              <ul className="space-y-2">
                {tx.checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      item.done ? 'bg-brand-accent text-white' : 'border border-surface-border'
                    }`}>
                      {item.done ? '✓' : ''}
                    </span>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <Link to="/offers" className="mt-4 inline-block text-sm font-semibold text-ink underline">
              Open offer room →
            </Link>
          </article>
        ))}
      </div>
    </DesktopShell>
  )
}

export default function TransactionCenterPage() {
  return <ProtectedRoute><TransactionCenter /></ProtectedRoute>
}
