import { WorkspaceShell } from './WorkspaceShell'

const TENANT_LINKS = [
  { to: '/tenant', label: 'Portal', end: true },
  { to: '/renter/leases', label: 'Lease' },
  { to: '/renter/payments', label: 'Payments' },
  { to: '/renter/maintenance', label: 'Maintenance' },
  { to: '/tenant/visitors', label: 'Visitor passes' },
  { to: '/tenant/access', label: 'Building access' },
  { to: '/tenant/community', label: 'Announcements' },
]

export default function TenantShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="Tenant portal"
      homePath="/tenant"
      links={TENANT_LINKS}
      {...props}
    />
  )
}
