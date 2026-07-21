import { CAPABILITIES, hasCapability } from './capabilities'
import { isProfessionalRole } from './roles'
import { CONSUMER_ROUTES, exploreModeUrl } from '../consumer-routes'
import { WORKSPACE_ENTRY_PATH } from '../../../lib/workspace'

const BUY_HUB_PATH = CONSUMER_ROUTES.applications
const RENT_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=rental`
const LEASE_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=lease`

/** Primary mobile bottom tabs — consumer experience */
export const CONSUMER_BOTTOM_TABS = [
  { id: 'home', to: CONSUMER_ROUTES.home, end: true, labelKey: 'mobile.home', icon: 'home' },
  { id: 'explore', to: CONSUMER_ROUTES.search, labelKey: 'mobile.explore', icon: 'search' },
  { id: 'saved', to: CONSUMER_ROUTES.saved, labelKey: 'mobile.saved', icon: 'heart' },
  { id: 'messages', to: CONSUMER_ROUTES.messages, labelKey: 'mobile.inbox', icon: 'message', authRequired: true },
  { id: 'profile', to: CONSUMER_ROUTES.profile, labelKey: 'mobile.profile', icon: 'user' },
]

/** Contextual tabs unlocked by capabilities */
export function getContextualTabs(capabilities = []) {
  const tabs = []

  if (hasCapability(capabilities, CAPABILITIES.LEASE)) {
    tabs.push(
      { to: LEASE_HUB_PATH, labelKey: 'profileNav.leaseJourney' },
      { to: '/renter/leases', labelKey: 'consumer.context.leases' },
      { to: '/renter/payments', labelKey: 'consumer.context.payments' },
      { to: '/renter/maintenance', labelKey: 'consumer.context.maintenance' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.RENT)) {
    tabs.push({ to: RENT_HUB_PATH, labelKey: 'profileNav.rentJourney' })
  }

  if (hasCapability(capabilities, CAPABILITIES.STAY_GUEST)) {
    tabs.push(
      { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.context.trips' },
      { to: CONSUMER_ROUTES.reservations, labelKey: 'consumer.context.reservations' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.BUY)) {
    tabs.push(
      { to: BUY_HUB_PATH, labelKey: 'profileNav.buyJourney' },
      { to: CONSUMER_ROUTES.applications, labelKey: 'consumer.context.offers' },
      { to: CONSUMER_ROUTES.transactions, labelKey: 'consumer.context.transactions' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.LEASE) || hasCapability(capabilities, 'smart_resident')) {
    tabs.push({ to: CONSUMER_ROUTES.leases, labelKey: 'consumer.context.myHome' })
  }

  return tabs
}

export const CONSUMER_QUICK_ACTIONS = [
  { to: exploreModeUrl('buy'), labelKey: 'consumer.actions.buy', cap: CAPABILITIES.BUY },
  { to: exploreModeUrl('rent'), labelKey: 'consumer.actions.rent', cap: CAPABILITIES.RENT },
  { to: exploreModeUrl('lease'), labelKey: 'consumer.actions.lease', cap: CAPABILITIES.LEASE },
  { to: exploreModeUrl('shortStay'), labelKey: 'consumer.actions.bookStay', cap: CAPABILITIES.STAY_GUEST },
  { to: '/offers', labelKey: 'consumer.actions.makeOffer', cap: CAPABILITIES.BUY },
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.actions.scheduleViewing', cap: CAPABILITIES.STAY_GUEST },
]

export const CONSUMER_ACTIVITY_LINKS = [
  { to: CONSUMER_ROUTES.search, labelKey: 'consumer.activity.search', icon: 'search' },
  { to: CONSUMER_ROUTES.saved, labelKey: 'consumer.activity.saved', icon: 'heart' },
  { to: CONSUMER_ROUTES.messages, labelKey: 'consumer.activity.messages', icon: 'message', authRequired: true },
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.activity.trips', icon: 'calendar', authRequired: true },
  { to: BUY_HUB_PATH, labelKey: 'profileNav.buyJourney', icon: 'document', authRequired: true, cap: CAPABILITIES.BUY },
  { to: RENT_HUB_PATH, labelKey: 'profileNav.rentJourney', icon: 'home', authRequired: true, cap: CAPABILITIES.RENT },
  { to: LEASE_HUB_PATH, labelKey: 'profileNav.leaseJourney', icon: 'home', authRequired: true, cap: CAPABILITIES.LEASE },
  { to: CONSUMER_ROUTES.transactions, labelKey: 'consumer.activity.transactions', icon: 'document', authRequired: true, cap: CAPABILITIES.BUY },
  { to: CONSUMER_ROUTES.wallet, labelKey: 'consumer.activity.wallet', icon: 'card', authRequired: true },
  { to: CONSUMER_ROUTES.maintenance, labelKey: 'consumer.activity.maintenance', icon: 'wrench', authRequired: true, cap: CAPABILITIES.LEASE },
  { to: CONSUMER_ROUTES.payments, labelKey: 'consumer.activity.billing', icon: 'card', authRequired: true, cap: CAPABILITIES.LEASE },
]

export const CONSUMER_AI_LINKS = [
  { to: CONSUMER_ROUTES.profile, labelKey: 'consumer.ai.recommendations' },
  { to: WORKSPACE_ENTRY_PATH, labelKey: 'consumer.ai.marketInsights' },
  { to: CONSUMER_ROUTES.mortgage, labelKey: 'consumer.ai.affordability' },
]

/** Pro-only route prefixes consumers must not access */
export const PRO_ROUTE_PREFIXES = [
  '/agent',
  '/agency',
  '/manage',
  '/developer',
  '/enterprise',
  '/admin',
  '/smart',
]

export function isProRoute(pathname) {
  return PRO_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function shouldUseConsumerNav(role) {
  return !isProfessionalRole(role)
}
