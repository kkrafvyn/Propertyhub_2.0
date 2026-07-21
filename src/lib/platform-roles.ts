export const PLATFORM_ROLES = {
  consumer: "consumer",
  buyer: "buyer",
  renter: "renter",
  independentAgent: "independent_agent",
  agencyAgent: "agency_agent",
  agencyManager: "agency_manager",
  agencyOwner: "agency_owner",
  propertyOwner: "property_owner",
  propertyManager: "property_manager",
  developer: "developer",
  enterpriseOperator: "enterprise_operator",
  platformModerator: "platform_moderator",
  platformAdmin: "platform_admin",
} as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export const CONSUMER_ROLE_ALIASES = [
  PLATFORM_ROLES.consumer,
  PLATFORM_ROLES.buyer,
  PLATFORM_ROLES.renter,
] as const;

export const AGENCY_ROLES = [
  PLATFORM_ROLES.independentAgent,
  PLATFORM_ROLES.agencyAgent,
  PLATFORM_ROLES.agencyManager,
  PLATFORM_ROLES.agencyOwner,
] as const;

export const PROPERTY_OPERATIONS_ROLES = [
  PLATFORM_ROLES.propertyOwner,
  PLATFORM_ROLES.propertyManager,
] as const;

export const PLATFORM_STAFF_ROLES = [
  PLATFORM_ROLES.developer,
  PLATFORM_ROLES.enterpriseOperator,
  PLATFORM_ROLES.platformModerator,
  PLATFORM_ROLES.platformAdmin,
] as const;

export function isConsumerRole(role?: string | null) {
  if (!role) return false;
  return CONSUMER_ROLE_ALIASES.includes(role as (typeof CONSUMER_ROLE_ALIASES)[number]);
}
