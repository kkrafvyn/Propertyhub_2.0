import { WorkspaceShell } from './WorkspaceShell'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'

const TENANT_LINKS = [
  { to: CONSUMER_ROUTES.profile, label: 'Portal', end: true },
  { to: CONSUMER_ROUTES.leases, label: 'Lease' },
  { to: CONSUMER_ROUTES.payments, label: 'Payments' },
  { to: CONSUMER_ROUTES.maintenance, label: 'Maintenance' },
  { to: '/tenant/visitors', label: 'Visitor passes' },
  { to: '/tenant/access', label: 'Building access' },
  { to: '/tenant/community', label: 'Announcements' },
]

export default function TenantShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="Tenant portal"
      homePath={CONSUMER_ROUTES.profile}
      links={TENANT_LINKS}
      {...props}
    />
  )
}
