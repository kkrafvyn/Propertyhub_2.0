import WorkspaceShell from './WorkspaceShell'

const HOST_LINKS = [
  { to: '/host', label: 'Dashboard', end: true },
  { to: '/host/listings', label: 'Listings' },
  { to: '/host/calendar', label: 'Calendar' },
  { to: '/host/reservations', label: 'Reservations' },
  { to: '/host/pricing', label: 'Pricing' },
  { to: '/host/cleaning', label: 'Cleaning' },
  { to: '/host/guests', label: 'Guests' },
  { to: '/host/payouts', label: 'Payouts' },
  { to: '/host/list', label: 'Add listing' },
]

export default function HostShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="Host workspace"
      homePath="/host"
      links={HOST_LINKS}
      {...props}
    />
  )
}
