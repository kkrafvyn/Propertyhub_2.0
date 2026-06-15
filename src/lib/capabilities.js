/** Capability-based access for BaytMiftah Real Estate OS */

export const CAPABILITIES = {
  BUY: 'buy',
  RENT: 'rent',
  STAY_GUEST: 'stay_guest',
  INVEST: 'invest',
  HOST_SHORT_STAY: 'host_short_stay',
  HOST_LONG_TERM: 'host_long_term',
  MANAGE_PROPERTY: 'manage_property',
  AGENT: 'agent',
  AGENCY: 'agency',
  ENTERPRISE: 'enterprise',
  ADMIN: 'admin',
}

/** Default capabilities granted by legacy persona roles */
export const ROLE_DEFAULT_CAPABILITIES = {
  buyer: [CAPABILITIES.BUY, CAPABILITIES.STAY_GUEST, CAPABILITIES.HOST_SHORT_STAY],
  renter: [CAPABILITIES.RENT, CAPABILITIES.STAY_GUEST],
  investor: [CAPABILITIES.INVEST, CAPABILITIES.BUY],
  consumer: [
    CAPABILITIES.BUY,
    CAPABILITIES.RENT,
    CAPABILITIES.STAY_GUEST,
    CAPABILITIES.INVEST,
  ],
  independent_agent: [CAPABILITIES.AGENT],
  agency_agent: [CAPABILITIES.AGENT, CAPABILITIES.AGENCY],
  agency_owner: [CAPABILITIES.AGENCY, CAPABILITIES.MANAGE_PROPERTY],
  agency_manager: [CAPABILITIES.AGENCY],
  property_owner: [
    CAPABILITIES.MANAGE_PROPERTY,
    CAPABILITIES.HOST_SHORT_STAY,
    CAPABILITIES.HOST_LONG_TERM,
    CAPABILITIES.BUY,
    CAPABILITIES.RENT,
  ],
  property_manager: [CAPABILITIES.MANAGE_PROPERTY, CAPABILITIES.RENT],
  developer: [CAPABILITIES.INVEST],
  enterprise_operator: [CAPABILITIES.ENTERPRISE, CAPABILITIES.INVEST],
  platform_moderator: [CAPABILITIES.ADMIN],
  platform_admin: [CAPABILITIES.ADMIN],
}

export function getDefaultCapabilitiesForRole(role) {
  return ROLE_DEFAULT_CAPABILITIES[role] || ROLE_DEFAULT_CAPABILITIES.consumer || []
}

export function mergeCapabilities(role, fetched = []) {
  const defaults = getDefaultCapabilitiesForRole(role)
  return [...new Set([...defaults, ...fetched])]
}

export function hasCapability(capabilitySet, capability) {
  if (!capability) return true
  const required = Array.isArray(capability) ? capability : [capability]
  return required.some((cap) => capabilitySet.includes(cap))
}

export function hasAllCapabilities(capabilitySet, capabilities) {
  return capabilities.every((cap) => capabilitySet.includes(cap))
}
