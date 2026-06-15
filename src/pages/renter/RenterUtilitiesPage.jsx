import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import IntegrationsBanner from '../../components/IntegrationsBanner'
import { utilityTypeLabel, utilityIcon } from '../../lib/utilities'
import { fetchUtilityDashboard, fetchMeterReadings } from '../../services/utility-service'
import { payUtility, payAllUtilities } from '../../services/payments-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function Utilities() {
  const [dashboard, setDashboard] = useState(null)
  const [readings, setReadings] = useState([])
  const [provider, setProvider] = useState(getDefaultProvider())
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState('')

  const accountId = dashboard?.accounts?.[0]?.id

  useEffect(() => {
    fetchUtilityDashboard().then(setDashboard)
  }, [])

  useEffect(() => {
    if (!accountId) return
    fetchMeterReadings(accountId).then(({ readings: rows }) => setReadings(rows ?? []))
  }, [accountId])

  const bills = dashboard?.bills ?? []
  const unpaid = bills.filter((b) => b.status === 'unpaid')
  const paid = bills.filter((b) => b.status === 'paid')
  const totalDue = dashboard?.summary?.totalDue ?? 0
  const isInclusive = dashboard?.accounts?.length === 0 && dashboard?.source === 'local'

  async function handlePayBill(bill) {
    setLoading(bill.id)
    setMessage('')
    const result = await payUtility({
      billId: bill.id,
      amount: bill.amount,
      provider,
      metadata: { utility_type: bill.type, billing_month: bill.month },
    })
    if (!result.checkout_url) {
      setMessage(result.message || 'Utility payment initiated.')
      if (result.ok) {
        await markLocalPaid(bill.id)
      }
    }
    setLoading(null)
  }

  async function markLocalPaid(billId) {
    setDashboard((prev) => {
      if (!prev) return prev
      const nextBills = prev.bills.map((b) => (b.id === billId ? { ...b, status: 'paid' } : b))
      const nextUnpaid = nextBills.filter((b) => b.status === 'unpaid')
      return {
        ...prev,
        bills: nextBills,
        summary: {
          totalDue: nextUnpaid.reduce((s, b) => s + b.amount, 0),
          unpaidCount: nextUnpaid.length,
        },
      }
    })
  }

  async function handlePayAll() {
    setLoading('all')
    setMessage('')
    const result = await payAllUtilities({ provider, amount: totalDue })
    if (!result.checkout_url) {
      setMessage(result.message || 'Pay-all initiated for utilities.')
    }
    setLoading(null)
  }

  if (!dashboard) {
    return (
      <RenterShell title="Utilities" subtitle="ECG, water, internet & gas">
        <p className="text-sm text-ink-secondary">Loading utility account…</p>
      </RenterShell>
    )
  }

  if (dashboard.accounts?.length === 0 && !isInclusive) {
    return (
      <RenterShell title="Utilities" subtitle="Included in your stay">
        <div className="rounded-xl border border-brand/30 bg-surface-hover px-4 py-6 text-center">
          <p className="text-4xl">🏠</p>
          <p className="mt-2 font-semibold text-ink">Utilities included</p>
          <p className="mt-1 text-sm text-ink-secondary">
            Short-term stays (&lt; 30 days) bundle all utilities in your nightly rate — no separate billing.
          </p>
        </div>
      </RenterShell>
    )
  }

  return (
    <RenterShell title="Utilities" subtitle="ECG, water, internet & gas breakdown">
      <IntegrationsBanner showPayments />

      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="panel-card bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-ink-secondary">Total due</p>
          <p className="text-2xl font-bold text-ink">GHS {totalDue.toLocaleString()}</p>
        </div>
        <div className="panel-card bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-ink-secondary">Unpaid bills</p>
          <p className="text-2xl font-bold text-ink">{unpaid.length}</p>
        </div>
        <div className="panel-card bg-surface p-4">
          <p className="text-xs font-semibold uppercase text-ink-secondary">Property</p>
          <p className="text-sm font-semibold text-ink truncate">{dashboard.accounts?.[0]?.property_id ?? '—'}</p>
        </div>
      </div>

      {unpaid.length > 0 && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-surface-border bg-surface-subtle p-4">
          <div className="max-w-xs">
            <p className="mb-2 text-sm font-semibold">Payment provider</p>
            <PaymentProviderPicker value={provider} onChange={setProvider} disabled={!!loading} />
          </div>
          <button
            type="button"
            onClick={handlePayAll}
            disabled={loading === 'all'}
            className="rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading === 'all' ? 'Redirecting…' : `Pay all · GHS ${totalDue.toLocaleString()}`}
          </button>
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">⚡ Utilities breakdown</h2>
        <div className="space-y-3">
          {bills.map((bill) => (
            <article key={bill.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{utilityIcon(bill.type)}</span>
                <div>
                  <p className="font-semibold">{utilityTypeLabel(bill.type)}</p>
                  <p className="text-sm text-ink-secondary">
                    {bill.providerName} · {bill.month}
                    {bill.usageUnits != null ? ` · ${bill.usageUnits} units` : ''}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-bold text-ink">GHS {bill.amount.toLocaleString()}</p>
                {bill.status === 'unpaid' ? (
                  <button
                    type="button"
                    onClick={() => handlePayBill(bill)}
                    disabled={loading === bill.id}
                    className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading === bill.id ? 'Redirecting…' : 'Pay'}
                  </button>
                ) : (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-200">Paid</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {readings.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">📊 Meter readings</h2>
          <div className="overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-subtle text-left text-ink-secondary">
                <tr>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Previous</th>
                  <th className="px-4 py-2">Current</th>
                  <th className="px-4 py-2">Used</th>
                  <th className="px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-t border-surface-border">
                    <td className="px-4 py-2">{utilityTypeLabel(r.utility_type)}</td>
                    <td className="px-4 py-2">{r.previous_reading}</td>
                    <td className="px-4 py-2">{r.current_reading}</td>
                    <td className="px-4 py-2 font-semibold">{r.units_used}</td>
                    <td className="px-4 py-2 text-ink-secondary">{r.reading_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {paid.length > 0 && unpaid.length === 0 && (
        <p className="mt-6 text-center text-sm text-ink-secondary">All utility bills are paid for this period.</p>
      )}
    </RenterShell>
  )
}

export default function RenterUtilitiesPage() {
  return <ProtectedRoute><Utilities /></ProtectedRoute>
}
