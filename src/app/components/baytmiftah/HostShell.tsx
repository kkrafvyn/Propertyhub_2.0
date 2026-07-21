import { WorkspaceShell } from './WorkspaceShell'
import { workspaceLinks } from '../../lib/workspace-shell-nav'
import { WORKSPACE_ENTRY_PATH } from '../../../lib/workspace'

const HOST_LINKS = workspaceLinks([
  { label: 'Dashboard', end: true },
  { page: 'listings', label: 'Listings' },
  { page: 'calendar', label: 'Calendar' },
  { page: 'host', label: 'Reservations' },
  { page: 'host', label: 'Pricing' },
  { page: 'host', label: 'Guests' },
  { page: 'payments', label: 'Payouts' },
  { page: 'new', label: 'Add listing' },
])

export default function HostShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="Host workspace"
      homePath={WORKSPACE_ENTRY_PATH}
      links={HOST_LINKS}
      {...props}
    />
  )
}
