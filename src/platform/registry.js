/** Canonical platform and role registry for BaytMiftah */

export const PLATFORMS = {
  MARKETPLACE: 'marketplace',
  BUYER: 'buyer',
  RENTER: 'renter',
  AGENT_CRM: 'agent_crm',
  AGENCY_ERP: 'agency_erp',
  PMS: 'pms',
  SMART_PROPERTY: 'smart_property',
  FINANCIAL: 'financial',
  INTELLIGENCE: 'intelligence',
  DEVELOPER: 'developer',
  ENTERPRISE: 'enterprise',
  TRUST: 'trust',
}

export const USER_ROLES = {
  BUYER: 'buyer',
  RENTER: 'renter',
  INVESTOR: 'investor',
  INDEPENDENT_AGENT: 'independent_agent',
  AGENCY_OWNER: 'agency_owner',
  AGENCY_MANAGER: 'agency_manager',
  AGENCY_AGENT: 'agency_agent',
  PROPERTY_OWNER: 'property_owner',
  PROPERTY_MANAGER: 'property_manager',
  DEVELOPER: 'developer',
  ENTERPRISE_OPERATOR: 'enterprise_operator',
  PLATFORM_ADMIN: 'platform_admin',
}

/** Default home route per role group */
export const ROLE_HOME_PATHS = {
  [USER_ROLES.BUYER]: '/',
  [USER_ROLES.RENTER]: '/renter',
  [USER_ROLES.INVESTOR]: '/intelligence',
  [USER_ROLES.INDEPENDENT_AGENT]: '/agent',
  [USER_ROLES.AGENCY_OWNER]: '/agency',
  [USER_ROLES.AGENCY_MANAGER]: '/agency',
  [USER_ROLES.AGENCY_AGENT]: '/agent',
  [USER_ROLES.PROPERTY_OWNER]: '/manage',
  [USER_ROLES.PROPERTY_MANAGER]: '/manage',
  [USER_ROLES.DEVELOPER]: '/developer',
  [USER_ROLES.ENTERPRISE_OPERATOR]: '/enterprise',
  [USER_ROLES.PLATFORM_ADMIN]: '/admin',
}

/** Platform metadata for nav, marketing, and future module loader */
export const PLATFORM_REGISTRY = [
  {
    id: PLATFORMS.MARKETPLACE,
    name: 'Marketplace',
    phase: 1,
    routePrefix: '/',
    status: 'connected',
  },
  {
    id: PLATFORMS.BUYER,
    name: 'Buyer App',
    phase: 1,
    routePrefix: '/buyer',
    status: 'connected',
  },
  {
    id: PLATFORMS.RENTER,
    name: 'Renter App',
    phase: 4,
    routePrefix: '/renter',
    status: 'connected',
  },
  {
    id: PLATFORMS.AGENT_CRM,
    name: 'Agent CRM',
    phase: 2,
    routePrefix: '/agent',
    status: 'connected',
  },
  {
    id: PLATFORMS.AGENCY_ERP,
    name: 'Agency ERP',
    phase: 3,
    routePrefix: '/agency',
    status: 'connected',
  },
  {
    id: PLATFORMS.PMS,
    name: 'Property Management',
    phase: 4,
    routePrefix: '/manage',
    status: 'connected',
  },
  {
    id: PLATFORMS.SMART_PROPERTY,
    name: 'Smart Property',
    phase: 6,
    routePrefix: '/smart',
    status: 'connected',
  },
  {
    id: PLATFORMS.FINANCIAL,
    name: 'Financial Services',
    phase: 5,
    routePrefix: '/finance',
    status: 'connected',
  },
  {
    id: PLATFORMS.INTELLIGENCE,
    name: 'Real Estate Intelligence',
    phase: 7,
    routePrefix: '/intelligence',
    status: 'connected',
  },
  {
    id: PLATFORMS.DEVELOPER,
    name: 'Developer Platform',
    phase: 7,
    routePrefix: '/developer',
    status: 'connected',
  },
  {
    id: PLATFORMS.ENTERPRISE,
    name: 'Enterprise Asset Management',
    phase: 7,
    routePrefix: '/enterprise',
    status: 'connected',
  },
  {
    id: PLATFORMS.TRUST,
    name: 'Trust & Compliance',
    phase: 8,
    routePrefix: '/admin',
    status: 'connected',
  },
]

export const REVENUE_STREAMS = [
  { id: 'saas', label: 'SaaS subscriptions', platforms: [PLATFORMS.AGENT_CRM, PLATFORMS.AGENCY_ERP, PLATFORMS.PMS] },
  { id: 'marketplace', label: 'Featured & sponsored listings', platforms: [PLATFORMS.MARKETPLACE] },
  { id: 'financial', label: 'Mortgage, escrow, insurance commissions', platforms: [PLATFORMS.FINANCIAL] },
  { id: 'smart', label: 'Device & automation subscriptions', platforms: [PLATFORMS.SMART_PROPERTY] },
  { id: 'enterprise', label: 'Portfolio licenses', platforms: [PLATFORMS.ENTERPRISE] },
  { id: 'data', label: 'Intelligence & valuation API', platforms: [PLATFORMS.INTELLIGENCE] },
]

export const AI_CAPABILITIES = [
  'property_search',
  'pricing',
  'listing_coach',
  'agency_assistant',
  'buyer_assistant',
  'tenant_assistant',
  'maintenance_assistant',
  'market_intelligence',
  'fraud_detection',
  'smart_building',
  'investment_advisor',
]
