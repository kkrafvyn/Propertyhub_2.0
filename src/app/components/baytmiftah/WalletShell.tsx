import { WorkspaceShell } from './WorkspaceShell'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'

const WALLET_LINKS = [
  { to: CONSUMER_ROUTES.wallet, label: 'Overview', end: true },
  { to: CONSUMER_ROUTES.transactions, label: 'Transactions' },
  { to: CONSUMER_ROUTES.payments, label: 'Payouts' },
  { to: '/wallet/escrow', label: 'Escrow holds' },
]

export default function WalletShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="BaytMiftah Wallet"
      homePath={CONSUMER_ROUTES.wallet}
      links={WALLET_LINKS}
      {...props}
    />
  )
}
