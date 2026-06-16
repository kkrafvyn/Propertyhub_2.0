import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ResponsivePageShell from '../../components/ResponsivePageShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { IconCheck, IconChevronRight } from '../../components/icons'
import {
  fetchTransactions,
  updateChecklistItem,
  advanceTransaction,
  completeTransaction,
} from '../../services/transaction-service'
import { settleCommission } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function TransactionCenterContent() {
  const [transactions, setTransactions] = useState([])
  const [busy, setBusy] = useState(null)

  function reload() {
    fetchTransactions().then(({ transactions: rows }) => setTransactions(rows))
  }

  useEffect(() => { reload() }, [])

  async function toggleChecklist(txId, itemId, done) {
    setBusy(`${txId}-${itemId}`)
    await updateChecklistItem(txId, itemId, !done)
    reload()
    setBusy(null)
  }

  async function handleAdvance(tx) {
    setBusy(tx.id)
    await advanceTransaction(tx.id)
    reload()
    setBusy(null)
  }

  async function handleComplete(txId) {
    setBusy(txId)
    const result = await completeTransaction(txId)
    if (result?.settlement?.id && result.settlement.status === 'pending') {
      await settleCommission({
        settlementId: result.settlement.id,
        amount: result.settlement.amount,
        provider: getDefaultProvider(),
      })
    }
    reload()
    setBusy(null)
  }

  return (
    <>
      <h1 className="text-2xl font-semibold lg:hidden">Transaction center</h1>
      <p className="mt-1 text-ink-secondary lg:hidden">Track offers, negotiations, escrow, and closing.</p>

      <div className="mt-6 space-y-6 lg:mt-8">
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
                {(tx.checklist ?? []).map((item) => (
                  <li key={item.id} className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      disabled={busy === `${tx.id}-${item.id}`}
                      onClick={() => toggleChecklist(tx.id, item.id, item.done)}
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        item.done ? 'bg-brand-accent text-white' : 'border border-surface-border'
                      }`}
                    >
                      {item.done ? <IconCheck className="h-3 w-3" /> : null}
                    </button>
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {tx.escrowId && tx.stage === 'escrow' && (
                <Link to="/finance/escrow" className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">
                  Fund escrow
                </Link>
              )}
              {tx.stage !== 'completed' && (
                <button
                  type="button"
                  disabled={busy === tx.id}
                  onClick={() => (tx.stage === 'closing' ? handleComplete(tx.id) : handleAdvance(tx))}
                  className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold text-ink"
                >
                  {tx.stage === 'closing' ? 'Mark completed' : 'Advance stage'}
                </button>
              )}
              {tx.commissionSettled && (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Commission queued</span>
              )}
              <Link to="/offers" className="inline-flex items-center gap-1 text-sm font-semibold text-ink underline">
                Open offer room
                <IconChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function TransactionCenterLayout() {
  return (
    <ResponsivePageShell title="Transaction center" subtitle="Offers, negotiations, and closing">
      <TransactionCenterContent />
    </ResponsivePageShell>
  )
}

export default function TransactionCenterPage() {
  return <ProtectedRoute><TransactionCenterLayout /></ProtectedRoute>
}
