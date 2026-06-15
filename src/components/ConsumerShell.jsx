import WorkspaceShell from './WorkspaceShell'

const CONSUMER_LINKS = [
  { to: '/consumer', label: 'Overview', end: true },
  { to: '/consumer/buy', label: 'Buy' },
  { to: '/consumer/rent', label: 'Rent' },
  { to: '/consumer/stay', label: 'Short stays' },
  { to: '/consumer/invest', label: 'Invest' },
  { to: '/wallet', label: 'Wallet' },
]

export default function ConsumerShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="BaytMiftah Consumer"
      homePath="/consumer"
      links={CONSUMER_LINKS}
      {...props}
    />
  )
}
