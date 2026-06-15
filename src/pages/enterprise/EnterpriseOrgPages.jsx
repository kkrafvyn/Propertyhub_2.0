import { useEffect, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import RoleProtectedRoute from '../../components/RoleProtectedRoute'
import { HubLinkGrid, PanelCard, PrimaryButton, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import {
  fetchOrganizations,
  fetchOrganizationMembers,
  fetchOrganizationPermissions,
  createOrganization,
} from '../../services/organization-service'

function EnterpriseOrganizationsHub() {
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    fetchOrganizations().then(({ organizations }) => setOrgs(organizations ?? []))
  }, [])

  const links = [
    { to: '/enterprise/organizations', label: 'Organizations', desc: 'REITs, funds, and operators' },
    { to: '/enterprise/users', label: 'Users', desc: 'Members across organizations' },
    { to: '/enterprise/permissions', label: 'Permissions', desc: 'Role-based org access' },
    { to: '/enterprise/portfolios', label: 'Portfolios', desc: 'Asset holdings' },
  ]

  return (
    <EnterpriseShell title="Organizations" subtitle="Multi-entity enterprise structure">
      <StatGrid cols={2}>
        <StatCard label="Organizations" value={orgs.length} />
        <StatCard label="Total members" value={orgs.reduce((s, o) => s + (o.members ?? 0), 0)} />
      </StatGrid>
      <HubLinkGrid links={links} className="mt-8" />
      <PanelCard title="Your organizations" className="mt-8">
        <ul className="divide-y divide-surface-border">
          {orgs.map((o) => (
            <li key={o.id} className="flex justify-between py-3 text-sm">
              <span>{o.name} · {o.country}</span>
              <span className="capitalize">{o.plan}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </EnterpriseShell>
  )
}

function EnterpriseUsersPage() {
  const [members, setMembers] = useState([])
  const orgId = 'org-1'

  useEffect(() => {
    fetchOrganizationMembers(orgId).then(({ members: m }) => setMembers(m ?? []))
  }, [])

  return (
    <EnterpriseShell title="Organization users" subtitle="Members and invitations">
      <PanelCard title="Members">
        {members.length === 0 ? (
          <p className="text-sm text-ink-secondary">Select an organization to view members.</p>
        ) : (
          <ul className="divide-y divide-surface-border text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex justify-between py-3">
                <span>{m.user_id}</span>
                <span className="capitalize">{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </EnterpriseShell>
  )
}

function EnterprisePermissionsPage() {
  const [permissions, setPermissions] = useState([])

  useEffect(() => {
    fetchOrganizationPermissions('org-1').then(({ permissions: p }) => setPermissions(p ?? []))
  }, [])

  return (
    <EnterpriseShell title="Permissions" subtitle="Role → capability matrix per organization">
      <PanelCard title="Permission matrix">
        <ul className="divide-y divide-surface-border text-sm">
          {permissions.map((p) => (
            <li key={p.id ?? `${p.role}-${p.permission}`} className="flex justify-between py-3">
              <span className="capitalize">{p.role}</span>
              <span>{p.permission}</span>
            </li>
          ))}
        </ul>
      </PanelCard>
    </EnterpriseShell>
  )
}

async function handleCreateOrg() {
  await createOrganization({ name: 'New Organization', slug: `org-${Date.now()}`, country: 'GH' })
}

function EnterpriseOrganizationsListPage() {
  return <EnterpriseOrganizationsHub />
}

export function EnterpriseOrganizationsPage() {
  return (
    <RoleProtectedRoute require="enterprise">
      <ProtectedRoute><EnterpriseOrganizationsListPage /></ProtectedRoute>
    </RoleProtectedRoute>
  )
}

export function EnterpriseOrgUsersPage() {
  return (
    <RoleProtectedRoute require="enterprise">
      <ProtectedRoute><EnterpriseUsersPage /></ProtectedRoute>
    </RoleProtectedRoute>
  )
}

export function EnterpriseOrgPermissionsPage() {
  return (
    <RoleProtectedRoute require="enterprise">
      <ProtectedRoute><EnterprisePermissionsPage /></ProtectedRoute>
    </RoleProtectedRoute>
  )
}
