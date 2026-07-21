import { WorkspaceShell } from './WorkspaceShell'

const WALLET_LINKS = [
  { to: '/wallet', label: 'Overview', end: true },
  { to: '/wallet/transactions', label: 'Transactions' },
  { to: '/wallet/payouts', label: 'Payouts' },
  { to: '/wallet/escrow', label: 'Escrow holds' },
]

export default function WalletShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="BaytMiftah Wallet"
      homePath="/wallet"
      links={WALLET_LINKS}
      {...props}
    />
  )
}
