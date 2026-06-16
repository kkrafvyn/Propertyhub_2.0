import { CAPABILITIES, hasCapability } from './capabilities'
import { isProfessionalRole } from './roles'

/** Primary mobile bottom tabs — consumer experience */
export const CONSUMER_BOTTOM_TABS = [
  { id: 'home', to: '/', end: true, labelKey: 'mobile.home', icon: 'home' },
  { id: 'explore', to: '/explore', labelKey: 'mobile.explore', icon: 'search' },
  { id: 'saved', to: '/saved', labelKey: 'mobile.saved', icon: 'heart' },
  { id: 'messages', to: '/messages', labelKey: 'mobile.inbox', icon: 'message', authRequired: true },
  { id: 'profile', to: '/profile', labelKey: 'mobile.profile', icon: 'user' },
]

/** Contextual tabs unlocked by capabilities */
export function getContextualTabs(capabilities = []) {
  const tabs = []

  if (hasCapability(capabilities, CAPABILITIES.RENT)) {
    tabs.push(
      { to: '/renter/leases', labelKey: 'consumer.context.leases' },
      { to: '/renter/payments', labelKey: 'consumer.context.payments' },
      { to: '/renter/maintenance', labelKey: 'consumer.context.maintenance' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.STAY_GUEST)) {
    tabs.push(
      { to: '/trips', labelKey: 'consumer.context.trips' },
      { to: '/consumer/stay', labelKey: 'consumer.context.reservations' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.BUY)) {
    tabs.push(
      { to: '/offers', labelKey: 'consumer.context.offers' },
      { to: '/transactions', labelKey: 'consumer.context.transactions' },
    )
  }

  if (hasCapability(capabilities, CAPABILITIES.RENT) || hasCapability(capabilities, 'smart_resident')) {
    tabs.push({ to: '/my-home', labelKey: 'consumer.context.myHome' })
  }

  return tabs
}

export const CONSUMER_QUICK_ACTIONS = [
  { to: '/explore?mode=buy', labelKey: 'consumer.actions.buy', cap: CAPABILITIES.BUY },
  { to: '/explore?mode=rent', labelKey: 'consumer.actions.rent', cap: CAPABILITIES.RENT },
  { to: '/explore?mode=stay', labelKey: 'consumer.actions.bookStay', cap: CAPABILITIES.STAY_GUEST },
  { to: '/offers', labelKey: 'consumer.actions.makeOffer', cap: CAPABILITIES.BUY },
  { to: '/trips', labelKey: 'consumer.actions.scheduleViewing', cap: CAPABILITIES.STAY_GUEST },
]

export const CONSUMER_ACTIVITY_LINKS = [
  { to: '/explore', labelKey: 'consumer.activity.search', icon: 'search' },
  { to: '/saved', labelKey: 'consumer.activity.saved', icon: 'heart' },
  { to: '/messages', labelKey: 'consumer.activity.messages', icon: 'message', authRequired: true },
  { to: '/trips', labelKey: 'consumer.activity.trips', icon: 'calendar', authRequired: true },
  { to: '/offers', labelKey: 'consumer.activity.offers', icon: 'document', authRequired: true, cap: 'buy' },
  { to: '/transactions', labelKey: 'consumer.activity.transactions', icon: 'document', authRequired: true, cap: 'buy' },
  { to: '/wallet', labelKey: 'consumer.activity.wallet', icon: 'card', authRequired: true },
  { to: '/renter/maintenance', labelKey: 'consumer.activity.maintenance', icon: 'wrench', authRequired: true, cap: 'rent' },
  { to: '/billing', labelKey: 'consumer.activity.billing', icon: 'card', authRequired: true },
]

export const CONSUMER_AI_LINKS = [
  { to: '/buyer/advisor', labelKey: 'consumer.ai.recommendations' },
  { to: '/intelligence/market', labelKey: 'consumer.ai.marketInsights' },
  { to: '/tools/mortgage', labelKey: 'consumer.ai.affordability' },
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
