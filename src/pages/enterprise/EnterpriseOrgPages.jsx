import { useEffect, useMemo, useState } from 'react'
import EnterpriseShell from '../../components/EnterpriseShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import RoleProtectedRoute from '../../components/RoleProtectedRoute'
import { HubLinkGrid, PanelCard, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import {
  fetchOrganizations,
  fetchOrganizationMembers,
  fetchOrganizationPermissions,
  createOrganization,
} from '../../services/organization-service'
import { useTranslation } from '../../i18n/LocaleContext'

function EnterpriseOrganizationsHub() {
  const { t } = useTranslation()
  const [orgs, setOrgs] = useState([])

  useEffect(() => {
    fetchOrganizations().then(({ organizations }) => setOrgs(organizations ?? []))
  }, [])

  const links = useMemo(() => [
    { to: '/enterprise/organizations', label: t('hubs.enterprise.organizations.links.organizations.label'), desc: t('hubs.enterprise.organizations.links.organizations.desc') },
    { to: '/enterprise/users', label: t('hubs.enterprise.organizations.links.users.label'), desc: t('hubs.enterprise.organizations.links.users.desc') },
    { to: '/enterprise/permissions', label: t('hubs.enterprise.organizations.links.permissions.label'), desc: t('hubs.enterprise.organizations.links.permissions.desc') },
    { to: '/enterprise/portfolios', label: t('hubs.enterprise.organizations.links.portfolios.label'), desc: t('hubs.enterprise.organizations.links.portfolios.desc') },
  ], [t])

  return (
    <EnterpriseShell titleKey="hubs.enterprise.organizations.title" subtitleKey="hubs.enterprise.organizations.subtitle">
      <StatGrid cols={2}>
        <StatCard label={t('hubs.enterprise.organizations.stats.organizations')} value={orgs.length} />
        <StatCard label={t('hubs.enterprise.organizations.stats.totalMembers')} value={orgs.reduce((s, o) => s + (o.members ?? 0), 0)} />
      </StatGrid>
      <HubLinkGrid links={links} className="mt-8" />
      <PanelCard title={t('hubs.enterprise.organizations.panel')} className="mt-8">
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
  const { t } = useTranslation()
  const [members, setMembers] = useState([])
  const orgId = 'org-1'

  useEffect(() => {
    fetchOrganizationMembers(orgId).then(({ members: m }) => setMembers(m ?? []))
  }, [])

  return (
    <EnterpriseShell titleKey="hubs.enterprise.users.title" subtitleKey="hubs.enterprise.users.subtitle">
      <PanelCard title={t('hubs.enterprise.users.panel')}>
        {members.length === 0 ? (
          <p className="text-sm text-ink-secondary">{t('hubs.enterprise.users.empty')}</p>
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
  const { t } = useTranslation()
  const [permissions, setPermissions] = useState([])

  useEffect(() => {
    fetchOrganizationPermissions('org-1').then(({ permissions: p }) => setPermissions(p ?? []))
  }, [])

  return (
    <EnterpriseShell titleKey="hubs.enterprise.permissions.title" subtitleKey="hubs.enterprise.permissions.subtitle">
      <PanelCard title={t('hubs.enterprise.permissions.panel')}>
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
