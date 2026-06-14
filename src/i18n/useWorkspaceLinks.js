import { useMemo } from 'react'
import { useTranslation } from './LocaleContext'

function useNavLinks(entries) {
  const { t } = useTranslation()
  return useMemo(
    () => entries.map(({ to, key, end }) => ({ to, label: t(`workspace.nav.${key}`), end })),
    [t, entries],
  )
}

export function useAgentShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/agent', key: 'dashboard', end: true },
    { to: '/agent/leads', key: 'leads' },
    { to: '/agent/listings', key: 'listings' },
    { to: '/agent/calendar', key: 'calendar' },
    { to: '/agent/tasks', key: 'tasks' },
    { to: '/agent/commissions', key: 'commissions' },
    { to: '/agent/analytics', key: 'analytics' },
    { to: '/agent/coach', key: 'listingCoach' },
  ])
  return { workspaceLabel: t('workspace.titles.agent'), homePath: '/agent', links }
}

export function useAgencyShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/agency', key: 'overview', end: true },
    { to: '/agency/branches', key: 'branches' },
    { to: '/agency/team', key: 'team' },
    { to: '/agency/leads', key: 'leads' },
    { to: '/agency/properties', key: 'properties' },
    { to: '/agency/payroll', key: 'payroll' },
    { to: '/agency/analytics', key: 'analytics' },
    { to: '/agency/trust', key: 'trustScore' },
    { to: '/agency/compliance', key: 'compliance' },
    { to: '/agency/onboarding', key: 'onboarding' },
    { to: '/documents', key: 'documents' },
  ])
  return { workspaceLabel: t('workspace.titles.agency'), homePath: '/agency', links }
}

export function useAdminShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/admin', key: 'overview', end: true },
    { to: '/admin/agencies', key: 'agencyVerification' },
    { to: '/admin/moderation', key: 'moderation' },
    { to: '/admin/kyc', key: 'kycAml' },
    { to: '/admin/fraud', key: 'fraudRisk' },
    { to: '/admin/ai', key: 'aiOrchestration' },
    { to: '/admin/valuation-api', key: 'valuationApi' },
    { to: '/admin/global', key: 'regionsCurrency' },
    { to: '/admin/audit', key: 'auditLog' },
  ])
  return { workspaceLabel: t('workspace.titles.admin'), homePath: '/admin', links }
}

export function useRenterShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/renter', key: 'home', end: true },
    { to: '/renter/leases', key: 'leases' },
    { to: '/renter/payments', key: 'rentPayments' },
    { to: '/renter/maintenance', key: 'maintenance' },
    { to: '/renter/sign', key: 'leaseSigning' },
  ])
  return { workspaceLabel: t('workspace.titles.renter'), homePath: '/renter', links }
}

export function useManageShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/manage', key: 'overview', end: true },
    { to: '/manage/tenants', key: 'tenants' },
    { to: '/manage/work-orders', key: 'workOrders' },
    { to: '/manage/finance', key: 'rentExpenses' },
    { to: '/manage/inspections', key: 'inspections' },
  ])
  return { workspaceLabel: t('workspace.titles.manage'), homePath: '/manage', links }
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
  ])
  return { workspaceLabel: t('workspace.titles.developer'), homePath: '/developer', links }
}

export function useEnterpriseShellNav() {
  const { t } = useTranslation()
  const links = useNavLinks([
    { to: '/enterprise', key: 'overview', end: true },
    { to: '/enterprise/portfolios', key: 'portfolios' },
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
