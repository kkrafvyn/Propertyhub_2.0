import WorkspaceShell from './WorkspaceShell'

const RESIDENT_LINKS = [
  { to: '/resident', label: 'Home', end: true },
  { to: '/resident/access', label: 'Door access' },
  { to: '/resident/visitors', label: 'Visitors' },
  { to: '/resident/energy', label: 'Energy' },
  { to: '/resident/announcements', label: 'Community' },
]

export default function ResidentShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="Smart resident"
      homePath="/resident"
      links={RESIDENT_LINKS}
      {...props}
    />
  )
}
