import { WorkspaceShell } from './WorkspaceShell'

export default function VendorShell(props) {
  const links = [
    { to: '/vendors', label: 'Overview', end: true },
    { to: '/vendors/directory', label: 'Directory' },
    { to: '/vendors/jobs', label: 'My jobs' },
    { to: '/vendors/dispatch', label: 'Dispatch' },
  ]
  return (
    <WorkspaceShell
      workspaceLabel="Vendor portal"
      homePath="/vendors"
      links={links}
      {...props}
    />
  )
}
