import { useMemo } from 'react'
import { useTranslation } from './LocaleContext'
import { isFullAdminRole } from '../lib/baytmiftah/roles'
import { CONSUMER_ROUTES } from '../lib/consumer-routes'
import { WORKSPACE_ENTRY_PATH } from '../../lib/workspace'

function workspaceNext(page, end = false) {
  return {
    to: page ? `${WORKSPACE_ENTRY_PATH}?next=${page}` : WORKSPACE_ENTRY_PATH,
    end,
  }
}

function useNavLinks(entries) {
  const { t } = useTranslation()
  return useMemo(
    () => entries.map(({ to, key, end }) => ({ to, label: t(`workspace.nav.${key}`), end })),
    [t, entries],
  )
}

const ADMIN_NAV_ENTRIES = [
  { to: '/admin', key: 'overview', end: true, fullAdminOnly: false },
  { to: '/admin/moderation', key: 'moderation', fullAdminOnly: false },
  { to: '/admin/kyc', key: 'kycAml', fullAdminOnly: false },
  { to: '/admin/fraud', key: 'fraudRisk', fullAdminOnly: false },
  { to: '/admin/users', key: 'userManagement', fullAdminOnly: true },
  { to: '/admin/agencies', key: 'agencyVerification', fullAdminOnly: true },
  { to: '/admin/ai', key: 'aiOrchestration', fullAdminOnly: true },
  { to: '/admin/valuation-api', key: 'valuationApi', fullAdminOnly: true },
  { to: '/admin/global', key: 'regionsCurrency', fullAdminOnly: true },
  { to: '/admin/integrations', key: 'integrations', fullAdminOnly: false },
  { to: '/admin/audit', key: 'auditLog', fullAdminOnly: true },
]

export function useAgentShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { ...workspaceNext('', true), key: 'dashboard' },
    { ...workspaceNext('leads'), key: 'leads' },
    { to: CONSUMER_ROUTES.messages, key: 'messages' },
    { ...workspaceNext('listings'), key: 'listings' },
    { ...workspaceNext('team-collaboration'), key: 'tasks' },
    { ...workspaceNext('predictive-analytics'), key: 'analytics' },
    { ...workspaceNext('ai-assistant'), key: 'listingCoach' },
  ])
  return { workspaceLabel: t('workspace.titles.agent'), homePath: WORKSPACE_ENTRY_PATH, links }
}

export function useAgencyShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { ...workspaceNext('', true), key: 'overview' },
    { ...workspaceNext('team'), key: 'team' },
    { ...workspaceNext('leads'), key: 'leads' },
    { ...workspaceNext('listings'), key: 'properties' },
    { ...workspaceNext('org-insights'), key: 'analytics' },
    { ...workspaceNext('integrations'), key: 'compliance' },
    { ...workspaceNext('settings'), key: 'onboarding' },
    { to: CONSUMER_ROUTES.documents, key: 'documents' },
  ])
  return { workspaceLabel: t('workspace.titles.agency'), homePath: WORKSPACE_ENTRY_PATH, links }
}

export function useAdminShellNav(role) {
  const { t } = useTranslation()
  const entries = useMemo(
    () => ADMIN_NAV_ENTRIES.filter((item) => !item.fullAdminOnly || isFullAdminRole(role)),
    [role],
  )
  const links = useNavLinks(entries)
  return { workspaceLabel: t('workspace.titles.admin'), homePath: '/admin', links }
}

export function useRenterShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: CONSUMER_ROUTES.search + '?listingType=lease', key: 'home', end: true },
    { to: CONSUMER_ROUTES.leases, key: 'leases' },
    { to: CONSUMER_ROUTES.payments, key: 'rentPayments' },
    { to: CONSUMER_ROUTES.maintenance, key: 'maintenance' },
    { to: '/renter/credit', key: 'credit' },
    { to: '/renter/sign', key: 'leaseSigning' },
  ])
  return { workspaceLabel: t('profileNav.leaseJourney'), homePath: CONSUMER_ROUTES.search, links }
}

export function useManageShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { ...workspaceNext('', true), key: 'overview' },
    { ...workspaceNext('vendors'), key: 'workOrders' },
    { ...workspaceNext('host'), key: 'tenants' },
    { ...workspaceNext('workflows'), key: 'applications' },
    { ...workspaceNext('notifications'), key: 'inspections' },
    { ...workspaceNext('settings'), key: 'utilities' },
  ])
  return { workspaceLabel: t('workspace.titles.manage'), homePath: WORKSPACE_ENTRY_PATH, links }
}

export function useFinanceShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/finance', key: 'overview', end: true },
    { to: '/finance/mortgages', key: 'mortgages' },
    { to: '/finance/escrow', key: 'escrow' },
    { to: '/finance/rent-collection', key: 'rentCollection' },
    { to: '/finance/insurance', key: 'insurance' },
    { to: '/finance/commissions', key: 'commissions' },
  ])
  return { workspaceLabel: t('workspace.titles.finance'), homePath: '/finance', links }
}

export function useIntelligenceShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/intelligence', key: 'overview', end: true },
    { to: '/intelligence/market', key: 'marketData' },
    { to: '/intelligence/heatmap', key: 'priceHeatmap' },
    { to: '/intelligence/valuation', key: 'aiValuation' },
  ])
  return { workspaceLabel: t('workspace.titles.intelligence'), homePath: '/intelligence', links }
}

export function useDeveloperShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/developer', key: 'overview', end: true },
    { to: '/developer/projects', key: 'projects' },
    { to: '/developer/construction', key: 'construction' },
    { to: '/developer/buyers', key: 'buyerPortal' },
    { to: '/developer/platform-api', key: 'platformApi' },
  ])
  return { workspaceLabel: t('workspace.titles.developer'), homePath: '/developer', links }
}

export function useEnterpriseShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/enterprise', key: 'overview', end: true },
    { to: '/enterprise/portfolios', key: 'portfolios' },
    { to: '/enterprise/organizations', key: 'organizations' },
    { to: '/enterprise/esg', key: 'esgReporting' },
    { to: '/enterprise/forecast', key: 'revenueForecast' },
  ])
  return { workspaceLabel: t('workspace.titles.enterprise'), homePath: '/enterprise', links }
}

export function useSmartShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/smart', key: 'overview', end: true },
    { to: '/smart/devices', key: 'devices' },
    { to: '/smart/automations', key: 'automations' },
    { to: '/smart/alerts', key: 'alertsLogs' },
  ])
  return { workspaceLabel: t('workspace.titles.smart'), homePath: '/smart', links }
}
