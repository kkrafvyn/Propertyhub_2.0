import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import WalletShell from '../../components/WalletShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { StatCard, StatGrid, PanelCard, PrimaryButton } from '../../components/ui/AirbnbUI'
import { fetchWalletDashboard, requestWalletWithdrawal } from '../../services/wallet-service'

function WalletHub() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchWalletDashboard().then(setData)
  }, [])

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
          <div className="flex flex-wrap gap-3">
            <PrimaryButton onClick={() => requestWalletWithdrawal({ amount: 1000 })}>Withdraw to MoMo</PrimaryButton>
            <PrimaryButton as={Link} to="/finance/escrow">View escrow</PrimaryButton>
          </div>
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
  return (
    <WalletShell title="Payouts" subtitle="Withdraw to mobile money or bank via Paystack">
      <PanelCard title="Payout accounts">
        <p className="text-sm text-ink-secondary">Link a verified payout account to receive host earnings and commission settlements.</p>
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
