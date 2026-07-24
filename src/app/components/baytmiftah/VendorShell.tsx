import { WorkspaceShell } from './WorkspaceShell'
import { WORKSPACE_ENTRY_PATH } from '../../../lib/workspace'

export default function VendorShell(props) {
  const links = [
    { to: `${WORKSPACE_ENTRY_PATH}?next=vendors`, label: 'Overview', end: true },
    { to: `${WORKSPACE_ENTRY_PATH}?next=vendors`, label: 'Directory' },
    { to: `${WORKSPACE_ENTRY_PATH}?next=workflows`, label: 'My jobs' },
    { to: `${WORKSPACE_ENTRY_PATH}?next=automation`, label: 'Dispatch' },
  ]
  return (
    <WorkspaceShell
      workspaceLabel="Vendor portal"
      homePath={WORKSPACE_ENTRY_PATH}
      links={links}
      {...props}
    />
  )
}
