import { useMemo } from 'react'
import { USER_ROLES } from '../platform/registry'
import { useTranslation } from '../i18n/LocaleContext'

export const WORKSPACE_LINKS = {
  buyer: { to: '/buyer', labelKey: 'profileNav.buyerWorkspace' },
  agent: { to: '/agent', labelKey: 'profileNav.agentCrm' },
  agency: { to: '/agency', labelKey: 'profileNav.agencyErp' },
  renter: { to: '/renter', labelKey: 'profileNav.renterWorkspace' },
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
  documents: { to: '/documents', labelKey: 'profileNav.documentVault' },
  compare: { to: '/compare', labelKey: 'nav.compare' },
  messages: { to: '/messages', labelKey: 'menu.messages' },
}

export const HOSTING_LINKS = [
  { to: '/host/list', labelKey: 'profileNav.listProperty' },
  { to: '/host/listings', labelKey: 'profileNav.yourListings' },
  { to: '/host/boost', labelKey: 'profileNav.featureListing' },
]

/** Profile sections shown per role — each user sees only their own workspace and tools. */
export const ROLE_PROFILE_CONFIG = {
  [USER_ROLES.BUYER]: {
    workspaces: ['buyer'],
    tools: ['trips', 'transactions', 'advisor', 'saved', 'documents', 'compare', 'messages'],
    hosting: true,
  },
  [USER_ROLES.RENTER]: {
    workspaces: ['renter'],
    tools: ['trips', 'documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.INVESTOR]: {
    workspaces: ['intelligence'],
    tools: ['saved', 'compare', 'advisor', 'documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.INDEPENDENT_AGENT]: {
    workspaces: ['agent'],
    tools: ['trips', 'transactions', 'documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.AGENCY_AGENT]: {
    workspaces: ['agent'],
    tools: ['trips', 'documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.AGENCY_OWNER]: {
    workspaces: ['agency'],
    tools: ['documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.AGENCY_MANAGER]: {
    workspaces: ['agency'],
    tools: ['documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.PROPERTY_OWNER]: {
    workspaces: ['manage', 'finance', 'smart'],
    tools: ['documents', 'messages'],
    hosting: true,
  },
  [USER_ROLES.PROPERTY_MANAGER]: {
    workspaces: ['manage', 'smart', 'finance'],
    tools: ['documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.DEVELOPER]: {
    workspaces: ['developer'],
    tools: ['documents', 'messages'],
    hosting: false,
  },
  [USER_ROLES.ENTERPRISE_OPERATOR]: {
    workspaces: ['enterprise', 'intelligence'],
    tools: ['documents', 'messages'],
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

/** Header menu shortcuts per role (profile + sign out are added separately). */
export const ROLE_MENU_CONFIG = {
  [USER_ROLES.BUYER]: ['saved', 'trips', 'documents', 'host'],
  [USER_ROLES.RENTER]: ['renter', 'trips', 'documents'],
  [USER_ROLES.INVESTOR]: ['saved', 'compare', 'intelligence'],
  [USER_ROLES.INDEPENDENT_AGENT]: ['agent', 'trips', 'documents'],
  [USER_ROLES.AGENCY_AGENT]: ['agent', 'trips', 'documents'],
  [USER_ROLES.AGENCY_OWNER]: ['agency', 'documents'],
  [USER_ROLES.AGENCY_MANAGER]: ['agency', 'documents'],
  [USER_ROLES.PROPERTY_OWNER]: ['manage', 'host', 'documents'],
  [USER_ROLES.PROPERTY_MANAGER]: ['manage', 'documents'],
  [USER_ROLES.DEVELOPER]: ['developer', 'documents'],
  [USER_ROLES.ENTERPRISE_OPERATOR]: ['enterprise', 'documents'],
  [USER_ROLES.PLATFORM_MODERATOR]: ['admin'],
  [USER_ROLES.PLATFORM_ADMIN]: ['admin'],
}

const MENU_ITEM_DEFS = {
  saved: TOOL_LINKS.saved,
  trips: TOOL_LINKS.trips,
  documents: TOOL_LINKS.documents,
  compare: TOOL_LINKS.compare,
  messages: TOOL_LINKS.messages,
  host: { to: '/host', labelKey: 'menu.listProperty' },
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
    .map(({ to, labelKey }) => ({ to, label: t(labelKey) }))
}

function getProfileConfig(role) {
  return ROLE_PROFILE_CONFIG[role] || ROLE_PROFILE_CONFIG[USER_ROLES.BUYER]
}

export function useRoleNavigation(role) {
  const { t } = useTranslation()
  const resolvedRole = role || USER_ROLES.BUYER

  return useMemo(() => {
    const config = getProfileConfig(resolvedRole)

    const workspaces = resolveLinks(config.workspaces, WORKSPACE_LINKS, t)
    const tools = resolveLinks(config.tools, TOOL_LINKS, t)
    const hosting = config.hosting
      ? HOSTING_LINKS.map(({ to, labelKey }) => ({ to, label: t(labelKey) }))
      : []

    const menuIds = ROLE_MENU_CONFIG[resolvedRole] || ROLE_MENU_CONFIG[USER_ROLES.BUYER]
    const menuLinks = resolveLinks(menuIds, MENU_ITEM_DEFS, t)

    const workspaceTitle = workspaces.length === 1
      ? t('profileNav.yourWorkspace')
      : t('profileNav.workspaces')

    return { workspaces, tools, hosting, menuLinks, workspaceTitle }
  }, [resolvedRole, t])
}
