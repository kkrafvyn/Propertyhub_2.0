import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WalletShell from '../../components/WalletShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { StatCard, StatGrid, PanelCard, PrimaryButton } from '../../components/ui/AirbnbUI'
import {
  fetchWalletDashboard,
  requestWalletWithdrawal,
  fetchPayoutAccounts,
  savePayoutAccount,
} from '../../services/wallet-service'

function WalletHub() {
  const [data, setData] = useState(null)
  const [withdrawAmount, setWithdrawAmount] = useState('500')
  const [withdrawMsg, setWithdrawMsg] = useState('')

  useEffect(() => {
    fetchWalletDashboard().then(setData)
  }, [])

  async function handleWithdraw() {
    const amount = Number(withdrawAmount)
    if (!amount || amount <= 0) return
    setWithdrawMsg('')
    const result = await requestWalletWithdrawal({ amount })
    setWithdrawMsg(result?.message || (result?.ok ? 'Withdrawal submitted.' : result?.error || 'Withdrawal failed'))
    fetchWalletDashboard().then(setData)
  }

  const wallet = data?.wallet
  const wallets = data?.wallets ?? (wallet ? [wallet] : [])

  return (
    <WalletShell title="Real estate wallet" subtitle="Rent, utility, escrow & general balances">
      {wallets.length > 0 && (
        <StatGrid cols={Math.min(wallets.length, 4)}>
          {wallets.map((w) => (
            <StatCard
              key={w.id}
              label={`${(w.purpose ?? 'general').replace(/^\w/, (c) => c.toUpperCase())} wallet`}
              value={`${w.currency} ${w.availableBalance?.toLocaleString()}`}
            />
          ))}
        </StatGrid>
      )}
      {wallet && wallets.length <= 1 && (
        <StatGrid cols={2}>
          <StatCard label="Available balance" value={`${wallet.currency} ${wallet.availableBalance?.toLocaleString()}`} />
          <StatCard label="Pending / held" value={`${wallet.currency} ${wallet.pendingBalance?.toLocaleString()}`} />
        </StatGrid>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <PanelCard title="Quick actions">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Withdraw (GHS)
              <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="mt-1 block w-32 rounded-lg border border-surface-border px-3 py-2 text-sm" />
            </label>
            <PrimaryButton onClick={handleWithdraw}>Withdraw via Paystack</PrimaryButton>
            <PrimaryButton as={Link} to="/finance/escrow">View escrow</PrimaryButton>
            <PrimaryButton as={Link} to="/wallet/payouts">Payout accounts</PrimaryButton>
          </div>
          {withdrawMsg && <p className="mt-2 text-sm text-ink-secondary">{withdrawMsg}</p>}
        </PanelCard>
        <PanelCard title="Recent activity">
          <ul className="text-sm">
            {(data?.transactions ?? []).slice(0, 5).map((tx) => (
              <li key={tx.id} className="flex justify-between py-2">
                <span>{tx.description ?? tx.type}</span>
                <span>GHS {Number(tx.amount).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </PanelCard>
      </div>
    </WalletShell>
  )
}

function WalletTransactionsPage() {
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    fetchWalletDashboard().then(({ transactions: t }) => setTransactions(t ?? []))
  }, [])

  return (
    <WalletShell title="Transactions" subtitle="Immutable ledger of all wallet movements">
      <PanelCard title="All transactions">
        <ul className="divide-y divide-surface-border">
          {transactions.map((tx) => (
            <li key={tx.id} className="flex justify-between py-3 text-sm">
              <div>
                <p className="font-medium capitalize">{tx.type}</p>
                <p className="text-ink-secondary">{tx.description} · {tx.created_at}</p>
              </div>
              <span className="font-medium">GHS {Number(tx.amount).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </WalletShell>
  )
}

function WalletPayoutsPage() {
  const [accounts, setAccounts] = useState([])
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankCode, setBankCode] = useState('MTN')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function reload() {
    fetchPayoutAccounts().then(({ accounts: rows }) => setAccounts(rows ?? []))
  }

  useEffect(() => { reload() }, [])

  async function handleSave(e) {
    e.preventDefault()
    if (!accountNumber.trim()) return
    setBusy(true)
    setMessage('')
    const result = await savePayoutAccount({
      accountNumber: accountNumber.trim(),
      accountName: accountName.trim() || undefined,
      bankCode,
    })
    if (result?.ok) {
      setMessage('Payout account saved.')
      setAccountNumber('')
      reload()
    } else {
      setMessage(result?.error || 'Could not save account.')
    }
    setBusy(false)
  }

  return (
    <WalletShell title="Payouts" subtitle="Withdraw to mobile money or bank via Paystack">
      <PanelCard title="Payout accounts">
        <p className="mb-4 text-sm text-ink-secondary">Link a verified payout account to receive host earnings and commission settlements.</p>
        {accounts.length > 0 && (
          <ul className="mb-4 divide-y divide-surface-border text-sm">
            {accounts.map((a) => (
              <li key={a.id} className="flex justify-between py-2">
                <span>{a.provider} · {a.account_ref ?? a.account_number}</span>
                <span className={a.verified ? 'text-green-700' : 'text-ink-secondary'}>{a.verified ? 'Verified' : 'Pending'}</span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleSave} className="space-y-3">
          <input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Account holder name"
            className="w-full max-w-md rounded-lg border border-surface-border px-4 py-2 text-sm"
          />
          <select value={bankCode} onChange={(e) => setBankCode(e.target.value)} className="w-full max-w-md rounded-lg border border-surface-border px-4 py-2 text-sm">
            <option value="MTN">MTN Mobile Money</option>
            <option value="VOD">Telecel Cash</option>
            <option value="ATL">AirtelTigo Money</option>
          </select>
          <input
            required
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="Mobile money or bank account number"
            className="w-full max-w-md rounded-lg border border-surface-border px-4 py-2 text-sm"
          />
          <PrimaryButton type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save payout account'}</PrimaryButton>
        </form>
        {message && <p className="mt-3 text-sm text-ink-secondary">{message}</p>}
      </PanelCard>
    </WalletShell>
  )
}

function WalletEscrowPage() {
  return (
    <WalletShell title="Escrow holds" subtitle="Funds held until transaction milestones complete">
      <PanelCard title="Active holds">
        <p className="text-sm text-ink-secondary">Escrow deposits appear as pending balance until release conditions are met.</p>
        <PrimaryButton as={Link} to="/finance/escrow" className="mt-4">Open escrow center</PrimaryButton>
      </PanelCard>
    </WalletShell>
  )
}

export function WalletHubPage() {
  return <ProtectedRoute><WalletHub /></ProtectedRoute>
}

export function WalletTransactionsPageExport() {
  return <ProtectedRoute><WalletTransactionsPage /></ProtectedRoute>
}

export function WalletPayoutsPageExport() {
  return <ProtectedRoute><WalletPayoutsPage /></ProtectedRoute>
}

export function WalletEscrowPageExport() {
  return <ProtectedRoute><WalletEscrowPage /></ProtectedRoute>
}
