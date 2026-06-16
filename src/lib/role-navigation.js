import { useMemo } from 'react'
import { USER_ROLES } from '../platform/registry'
import { useTranslation } from '../i18n/LocaleContext'

export const WORKSPACE_LINKS = {
  consumer: { to: '/', labelKey: 'profileNav.consumerWorkspace' },
  buyer: { to: '/consumer/buy', labelKey: 'profileNav.buyerWorkspace' },
  agent: { to: '/agent', labelKey: 'profileNav.agentCrm' },
  agency: { to: '/agency', labelKey: 'profileNav.agencyErp' },
  renter: { to: '/consumer/rent', labelKey: 'profileNav.renterWorkspace' },
  tenant: { to: '/tenant', labelKey: 'profileNav.tenantPortal' },
  host: { to: '/host', labelKey: 'profileNav.hostWorkspace' },
  wallet: { to: '/wallet', labelKey: 'profileNav.wallet' },
  investment: { to: '/investment', labelKey: 'profileNav.investmentCenter' },
  resident: { to: '/my-home', labelKey: 'profileNav.smartResident' },
  manage: { to: '/manage', labelKey: 'profileNav.propertyManagement' },
  smart: { to: '/smart', labelKey: 'profileNav.smartProperty' },
  finance: { to: '/finance', labelKey: 'profileNav.financialServices' },
  intelligence: { to: '/intelligence', labelKey: 'profileNav.intelligenceHub' },
  developer: { to: '/developer', labelKey: 'profileNav.developerPlatform' },
  enterprise: { to: '/enterprise', labelKey: 'profileNav.enterpriseAssets' },
  admin: { to: '/admin', labelKey: 'menu.admin' },
}

export const TOOL_LINKS = {
  trips: { to: '/trips', labelKey: 'profileNav.tripsViewings' },
  transactions: { to: '/transactions', labelKey: 'profileNav.transactionCenter' },
  advisor: { to: '/buyer/advisor', labelKey: 'profileNav.aiAdvisor' },
  saved: { to: '/saved', labelKey: 'profileNav.savedHomes' },
  documents: { to: '/document-vault', labelKey: 'profileNav.documentVault' },
  kyc: { to: '/profile/kyc', labelKey: 'profileNav.kycVerification' },
  compare: { to: '/compare', labelKey: 'nav.compare' },
  messages: { to: '/messages', labelKey: 'menu.messages' },
}

export const HOSTING_LINKS = [
  { to: '/host', labelKey: 'profileNav.hostDashboard' },
  { to: '/host/list', labelKey: 'profileNav.listProperty' },
  { to: '/host/listings', labelKey: 'profileNav.yourListings' },
  { to: '/host/reservations', labelKey: 'profileNav.reservations' },
  { to: '/host/calendar', labelKey: 'profileNav.calendar' },
  { to: '/host/payouts', labelKey: 'profileNav.hostPayouts' },
  { to: '/host/boost', labelKey: 'profileNav.featureListing' },
]

const CONSUMER_TOOLS = ['trips', 'transactions', 'advisor', 'saved', 'documents', 'kyc', 'compare', 'messages']

/** Profile sections — capability-aware; legacy roles map to consumer modules */
export const ROLE_PROFILE_CONFIG = {
  [USER_ROLES.CONSUMER]: {
    workspaces: ['wallet', 'investment', 'tenant', 'resident'],
    tools: CONSUMER_TOOLS,
    hosting: false,
  },
  [USER_ROLES.BUYER]: {
    workspaces: ['wallet', 'investment'],
    tools: CONSUMER_TOOLS,
    hosting: false,
  },
  [USER_ROLES.RENTER]: {
    workspaces: ['tenant', 'resident', 'wallet'],
    tools: ['trips', 'documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.INVESTOR]: {
    workspaces: ['investment', 'wallet'],
    tools: ['saved', 'compare', 'advisor', 'documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.INDEPENDENT_AGENT]: {
    workspaces: ['agent', 'wallet'],
    tools: ['trips', 'transactions', 'documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.AGENCY_AGENT]: {
    workspaces: ['agent'],
    tools: ['trips', 'documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.AGENCY_OWNER]: {
    workspaces: ['agency', 'wallet'],
    tools: ['documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.AGENCY_MANAGER]: {
    workspaces: ['agency'],
    tools: ['documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.PROPERTY_OWNER]: {
    workspaces: ['manage', 'finance', 'smart', 'host', 'wallet'],
    tools: ['documents', 'kyc', 'messages'],
    hosting: true,
  },
  [USER_ROLES.PROPERTY_MANAGER]: {
    workspaces: ['manage', 'smart', 'finance', 'wallet'],
    tools: ['documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.DEVELOPER]: {
    workspaces: ['developer', 'investment'],
    tools: ['documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.ENTERPRISE_OPERATOR]: {
    workspaces: ['enterprise', 'intelligence', 'investment'],
    tools: ['documents', 'kyc', 'messages'],
    hosting: false,
  },
  [USER_ROLES.PLATFORM_MODERATOR]: {
    workspaces: [],
    tools: ['messages'],
    hosting: false,
  },
  [USER_ROLES.PLATFORM_ADMIN]: {
    workspaces: [],
    tools: ['messages'],
    hosting: false,
  },
}

export const ROLE_MENU_CONFIG = {
  [USER_ROLES.CONSUMER]: ['saved', 'trips', 'wallet'],
  [USER_ROLES.BUYER]: ['saved', 'trips', 'wallet'],
  [USER_ROLES.RENTER]: ['tenant', 'trips', 'resident', 'documents'],
  [USER_ROLES.INVESTOR]: ['investment', 'saved', 'compare'],
  [USER_ROLES.INDEPENDENT_AGENT]: ['agent', 'trips', 'wallet', 'documents'],
  [USER_ROLES.AGENCY_AGENT]: ['agent', 'trips', 'documents'],
  [USER_ROLES.AGENCY_OWNER]: ['agency', 'wallet', 'documents'],
  [USER_ROLES.AGENCY_MANAGER]: ['agency', 'documents'],
  [USER_ROLES.PROPERTY_OWNER]: ['manage', 'host', 'wallet', 'documents'],
  [USER_ROLES.PROPERTY_MANAGER]: ['manage', 'wallet', 'documents'],
  [USER_ROLES.DEVELOPER]: ['developer', 'investment', 'documents'],
  [USER_ROLES.ENTERPRISE_OPERATOR]: ['enterprise', 'investment', 'documents'],
  [USER_ROLES.PLATFORM_MODERATOR]: ['admin'],
  [USER_ROLES.PLATFORM_ADMIN]: ['admin'],
}

const MENU_ITEM_DEFS = {
  saved: TOOL_LINKS.saved,
  trips: TOOL_LINKS.trips,
  documents: TOOL_LINKS.documents,
  compare: TOOL_LINKS.compare,
  messages: TOOL_LINKS.messages,
  wallet: WORKSPACE_LINKS.wallet,
  investment: WORKSPACE_LINKS.investment,
  host: WORKSPACE_LINKS.host,
  tenant: WORKSPACE_LINKS.tenant,
  resident: WORKSPACE_LINKS.resident,
  renter: WORKSPACE_LINKS.renter,
  agent: WORKSPACE_LINKS.agent,
  agency: WORKSPACE_LINKS.agency,
  manage: WORKSPACE_LINKS.manage,
  intelligence: WORKSPACE_LINKS.intelligence,
  developer: WORKSPACE_LINKS.developer,
  enterprise: WORKSPACE_LINKS.enterprise,
  admin: WORKSPACE_LINKS.admin,
}

function resolveLinks(ids, catalog, t) {
  return ids
    .map((id) => catalog[id])
    .filter(Boolean)
    .map(({ to, labelKey }) => ({ to, label: t(labelKey) || labelKey }))
}

function getProfileConfig(role) {
  return ROLE_PROFILE_CONFIG[role] || ROLE_PROFILE_CONFIG[USER_ROLES.CONSUMER]
}

export function useRoleNavigation(role) {
  const { t } = useTranslation()
  const resolvedRole = role || USER_ROLES.CONSUMER

  return useMemo(() => {
    const config = getProfileConfig(resolvedRole)

    const workspaces = resolveLinks(config.workspaces, WORKSPACE_LINKS, t)
    const tools = resolveLinks(config.tools, TOOL_LINKS, t)
    const hosting = config.hosting
      ? HOSTING_LINKS.map(({ to, labelKey }) => ({ to, label: t(labelKey) || labelKey }))
      : []

    const menuIds = ROLE_MENU_CONFIG[resolvedRole] || ROLE_MENU_CONFIG[USER_ROLES.CONSUMER]
    const menuLinks = resolveLinks(menuIds, MENU_ITEM_DEFS, t)

    const workspaceTitle = workspaces.length === 1
      ? t('profileNav.yourWorkspace')
      : t('profileNav.workspaces')

    return { workspaces, tools, hosting, menuLinks, workspaceTitle }
  }, [resolvedRole, t])
}
