import { CAPABILITIES, hasCapability } from './capabilities'
import { isProfessionalRole } from './roles'
import { CONSUMER_ROUTES, exploreModeUrl } from '../consumer-routes'
import { WORKSPACE_ENTRY_PATH } from '../../../lib/workspace'

/** Primary mobile bottom tabs — consumer experience */
export const CONSUMER_BOTTOM_TABS = [
  { id: 'home', to: CONSUMER_ROUTES.home, end: true, labelKey: 'mobile.home', icon: 'home' },
  { id: 'explore', to: CONSUMER_ROUTES.search, labelKey: 'mobile.explore', icon: 'search' },
  { id: 'saved', to: CONSUMER_ROUTES.saved, labelKey: 'mobile.saved', icon: 'heart' },
  { id: 'messages', to: CONSUMER_ROUTES.messages, labelKey: 'mobile.inbox', icon: 'message', authRequired: true },
  { id: 'profile', to: CONSUMER_ROUTES.settings, labelKey: 'mobile.profile', icon: 'user' },
]

/** Contextual tabs unlocked by capabilities */
export function getContextualTabs(capabilities = []) {
  const tabs = []

  if (hasCapability(capabilities, CAPABILITIES.LEASE)) {
    tabs.push(
      { to: `${CONSUMER_ROUTES.search}?listingType=lease`, labelKey: 'profileNav.leaseJourney' },
      { to: CONSUMER_ROUTES.leases, labelKey: 'consumer.context.leases' },
      { to: CONSUMER_ROUTES.payments, labelKey: 'consumer.context.payments' },
      { to: CONSUMER_ROUTES.maintenance, labelKey: 'consumer.context.maintenance' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.RENT)) {
    tabs.push({ to: `${CONSUMER_ROUTES.search}?listingType=rental`, labelKey: 'profileNav.rentJourney' })
  }

  if (hasCapability(capabilities, CAPABILITIES.STAY_GUEST)) {
    tabs.push(
      { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.context.trips' },
      { to: CONSUMER_ROUTES.reservations, labelKey: 'consumer.context.reservations' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.BUY)) {
    tabs.push(
      { to: CONSUMER_ROUTES.applications, labelKey: 'profileNav.buyJourney' },
      { to: CONSUMER_ROUTES.applications, labelKey: 'consumer.context.offers' },
      { to: CONSUMER_ROUTES.transactions, labelKey: 'consumer.context.transactions' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.LEASE) || hasCapability(capabilities, 'smart_resident')) {
    tabs.push({ to: CONSUMER_ROUTES.leases, labelKey: 'consumer.context.myHome' })
  }

  if (hasCapability(capabilities, CAPABILITIES.STAY_HOST)) {
    tabs.push(
      { to: WORKSPACE_ENTRY_PATH, labelKey: 'consumer.context.hostDashboard' },
      { to: `${WORKSPACE_ENTRY_PATH}?next=new`, labelKey: 'consumer.context.listProperty' },
    )
  }

  return tabs
}

export const CONSUMER_QUICK_ACTIONS = [
  { to: exploreModeUrl('buy'), labelKey: 'consumer.actions.buy', cap: CAPABILITIES.BUY },
  { to: exploreModeUrl('rent'), labelKey: 'consumer.actions.rent', cap: CAPABILITIES.RENT },
  { to: exploreModeUrl('lease'), labelKey: 'consumer.actions.lease', cap: CAPABILITIES.LEASE },
  { to: exploreModeUrl('shortStay'), labelKey: 'consumer.actions.bookStay', cap: CAPABILITIES.STAY_GUEST },
  { to: CONSUMER_ROUTES.applications, labelKey: 'consumer.actions.makeOffer', cap: CAPABILITIES.BUY },
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.actions.scheduleViewing', cap: CAPABILITIES.STAY_GUEST },
]

export const CONSUMER_ACTIVITY_LINKS = [
  { to: CONSUMER_ROUTES.search, labelKey: 'consumer.activity.search', icon: 'search' },
  { to: CONSUMER_ROUTES.saved, labelKey: 'consumer.activity.saved', icon: 'heart' },
  { to: CONSUMER_ROUTES.messages, labelKey: 'consumer.activity.messages', icon: 'message', authRequired: true },
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.activity.trips', icon: 'calendar', authRequired: true },
  { to: CONSUMER_ROUTES.applications, labelKey: 'profileNav.buyJourney', icon: 'document', authRequired: true, cap: CAPABILITIES.BUY },
  { to: `${CONSUMER_ROUTES.search}?listingType=rental`, labelKey: 'profileNav.rentJourney', icon: 'home', authRequired: true, cap: CAPABILITIES.RENT },
  { to: `${CONSUMER_ROUTES.search}?listingType=lease`, labelKey: 'profileNav.leaseJourney', icon: 'home', authRequired: true, cap: CAPABILITIES.LEASE },
  { to: CONSUMER_ROUTES.transactions, labelKey: 'consumer.activity.transactions', icon: 'document', authRequired: true, cap: CAPABILITIES.BUY },
  { to: CONSUMER_ROUTES.wallet, labelKey: 'consumer.activity.wallet', icon: 'card', authRequired: true },
  { to: CONSUMER_ROUTES.maintenance, labelKey: 'consumer.activity.maintenance', icon: 'wrench', authRequired: true, cap: CAPABILITIES.LEASE },
  { to: CONSUMER_ROUTES.payments, labelKey: 'consumer.activity.billing', icon: 'card', authRequired: true, cap: CAPABILITIES.LEASE },
]

export const CONSUMER_AI_LINKS = [
  { to: CONSUMER_ROUTES.profile, labelKey: 'consumer.ai.recommendations' },
  { to: WORKSPACE_ENTRY_PATH, labelKey: 'consumer.ai.marketInsights' },
  { to: CONSUMER_ROUTES.mortgage, labelKey: 'consumer.ai.affordability' },
  { to: CONSUMER_ROUTES.insurance, labelKey: 'consumer.activity.insurance', authRequired: true },
  { to: CONSUMER_ROUTES.vendors, labelKey: 'consumer.activity.vendors', authRequired: true },
]

/** Pro-only route prefixes consumers must not access */
export const PRO_ROUTE_PREFIXES = [
  '/agent',
  '/agency',
  '/manage',
  '/developer',
  '/enterprise',
  '/admin',
  '/finance',
  '/intelligence',
  '/investment',
]

export function isProRoute(pathname) {
  return PRO_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function shouldUseConsumerNav(role) {
  return !isProfessionalRole(role)
}
