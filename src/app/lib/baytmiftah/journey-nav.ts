/**
 * Consumer journey links — Buy, Rent, Lease, Stay (investment out of consumer scope).
 * Labels use i18n keys; call mapJourneyLinks(links, t) before rendering.
 */

import { exploreModeUrl } from './explore-filters'
import { CONSUMER_ROUTES } from '../consumer-routes'
import { WORKSPACE_ENTRY_PATH } from '../../../lib/workspace'

export { exploreModeUrl }

export const BUY_HUB_PATH = CONSUMER_ROUTES.applications
export const RENT_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=rental`
export const LEASE_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=lease`
export const CONSUMER_HUB_PATH = CONSUMER_ROUTES.profile
export const STAY_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=short_stay`

export function mapJourneyLinks(links, t) {
  return links.map(({ to, labelKey, descKey, label, desc }) => ({
    to,
    label: labelKey ? t(labelKey) : label,
    desc: descKey ? t(descKey) : desc,
  }))
}

export const BUY_JOURNEY_LINKS = [
  { to: CONSUMER_ROUTES.saved, labelKey: 'buyerHub.links.saved.label', descKey: 'buyerHub.links.saved.desc' },
  { to: CONSUMER_ROUTES.trips, labelKey: 'buyerHub.links.trips.label', descKey: 'buyerHub.links.trips.desc' },
  { to: CONSUMER_ROUTES.applications, labelKey: 'buyerHub.links.offers.label', descKey: 'buyerHub.links.offers.desc' },
  { to: CONSUMER_ROUTES.transactions, labelKey: 'buyerHub.links.transactions.label', descKey: 'buyerHub.links.transactions.desc' },
  { to: CONSUMER_ROUTES.documents, labelKey: 'buyerHub.links.documents.label', descKey: 'buyerHub.links.documents.desc' },
  { to: CONSUMER_ROUTES.mortgage, labelKey: 'buyerHub.links.finance.label', descKey: 'buyerHub.links.finance.desc' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'buyerHub.links.advisor.label', descKey: 'buyerHub.links.advisor.desc' },
  { to: CONSUMER_ROUTES.compare, labelKey: 'buyerHub.links.compare.label', descKey: 'buyerHub.links.compare.desc' },
  { to: CONSUMER_ROUTES.search, labelKey: 'buyerHub.links.neighborhoods.label', descKey: 'buyerHub.links.neighborhoods.desc' },
  { to: CONSUMER_ROUTES.kyc, labelKey: 'consumer.journeys.buy.kyc.label', descKey: 'consumer.journeys.buy.kyc.desc' },
]

export const RENT_JOURNEY_LINKS = [
  { to: exploreModeUrl('rent'), labelKey: 'consumer.journeys.rent.browseRent.label', descKey: 'consumer.journeys.rent.browseRent.desc' },
  { to: exploreModeUrl('lease'), labelKey: 'consumer.journeys.rent.browseLease.label', descKey: 'consumer.journeys.rent.browseLease.desc' },
  { to: CONSUMER_ROUTES.applications, labelKey: 'consumer.journeys.rent.apply.label', descKey: 'consumer.journeys.rent.apply.desc' },
  { to: CONSUMER_ROUTES.saved, labelKey: 'buyerHub.links.saved.label', descKey: 'consumer.journeys.rent.saved.desc' },
  { to: CONSUMER_ROUTES.trips, labelKey: 'buyerHub.links.trips.label', descKey: 'consumer.journeys.rent.trips.desc' },
  { to: LEASE_HUB_PATH, labelKey: 'profileNav.leaseJourney', descKey: 'consumer.journeys.rent.myLease.desc' },
]

export const LEASE_JOURNEY_LINKS = [
  { to: CONSUMER_ROUTES.leases, labelKey: 'workspace.nav.leases', descKey: 'hubs.renter.leases.subtitle' },
  { to: CONSUMER_ROUTES.payments, labelKey: 'workspace.nav.rentPayments', descKey: 'hubs.renter.payments.subtitle' },
  { to: CONSUMER_ROUTES.maintenance, labelKey: 'workspace.nav.maintenance', descKey: 'hubs.renter.maintenance.subtitle' },
  { to: CONSUMER_ROUTES.documents, labelKey: 'profileNav.documentVault', descKey: 'buyerHub.links.documents.desc' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'profileNav.tenantPortal', descKey: 'consumer.journeys.lease.tenant.desc' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'profileNav.smartResident', descKey: 'consumer.journeys.lease.myHome.desc' },
]

export const STAY_JOURNEY_LINKS = [
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.journeys.stay.trips.label', descKey: 'consumer.journeys.stay.trips.desc' },
  { to: exploreModeUrl('shortStay'), labelKey: 'consumer.journeys.stay.browse.label', descKey: 'consumer.journeys.stay.browse.desc' },
]

export const CONSUMER_HUB_LINKS = [
  { to: BUY_HUB_PATH, labelKey: 'profileNav.buyJourney', descKey: 'consumer.journeys.hub.buy.desc' },
  { to: RENT_HUB_PATH, labelKey: 'profileNav.rentJourney', descKey: 'consumer.journeys.hub.rent.desc' },
  { to: LEASE_HUB_PATH, labelKey: 'profileNav.leaseJourney', descKey: 'consumer.journeys.hub.lease.desc' },
  { to: STAY_HUB_PATH, labelKey: 'consumer.journeys.stay.title', descKey: 'consumer.journeys.hub.stay.desc' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'profileNav.tenantPortal', descKey: 'consumer.journeys.hub.tenant.desc' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'profileNav.smartResident', descKey: 'consumer.journeys.hub.myHome.desc' },
  { to: CONSUMER_ROUTES.wallet, labelKey: 'profileNav.wallet', descKey: 'consumer.journeys.hub.wallet.desc' },
  { to: `${WORKSPACE_ENTRY_PATH}?next=host`, labelKey: 'profileNav.hostWorkspace', descKey: 'consumer.journeys.hub.host.desc' },
]

export const BUY_MOBILE_TILES = [
  { to: CONSUMER_ROUTES.saved, labelKey: 'consumer.journeys.mobile.saved' },
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.journeys.mobile.trips' },
  { to: CONSUMER_ROUTES.applications, labelKey: 'consumer.journeys.mobile.offers' },
  { to: CONSUMER_ROUTES.transactions, labelKey: 'consumer.journeys.mobile.transactions' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'consumer.journeys.mobile.advisor' },
  { to: CONSUMER_ROUTES.mortgage, labelKey: 'consumer.journeys.mobile.finance' },
  { to: CONSUMER_ROUTES.compare, labelKey: 'consumer.journeys.mobile.compare' },
  { to: CONSUMER_ROUTES.search, labelKey: 'consumer.journeys.mobile.areas' },
  { to: CONSUMER_ROUTES.kyc, labelKey: 'consumer.journeys.mobile.kyc' },
]

export const RENT_MOBILE_TILES = [
  { to: exploreModeUrl('rent'), labelKey: 'consumer.journeys.mobile.rentals' },
  { to: exploreModeUrl('lease'), labelKey: 'consumer.journeys.mobile.forLease' },
  { to: CONSUMER_ROUTES.applications, labelKey: 'consumer.journeys.mobile.apply' },
  { to: CONSUMER_ROUTES.saved, labelKey: 'consumer.journeys.mobile.saved' },
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.journeys.mobile.viewings' },
  { to: LEASE_HUB_PATH, labelKey: 'consumer.journeys.mobile.myLease' },
]

export const LEASE_MOBILE_TILES = [
  { to: CONSUMER_ROUTES.leases, labelKey: 'consumer.journeys.mobile.leases' },
  { to: CONSUMER_ROUTES.payments, labelKey: 'consumer.journeys.mobile.payments' },
  { to: CONSUMER_ROUTES.maintenance, labelKey: 'consumer.journeys.mobile.maintenance' },
  { to: CONSUMER_ROUTES.documents, labelKey: 'consumer.journeys.mobile.sign' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'consumer.journeys.mobile.tenant' },
  { to: CONSUMER_ROUTES.profile, labelKey: 'consumer.journeys.mobile.myHome' },
]

export const STAY_MOBILE_TILES = [
  { to: CONSUMER_ROUTES.trips, labelKey: 'consumer.journeys.mobile.trips' },
  { to: exploreModeUrl('shortStay'), labelKey: 'consumer.journeys.mobile.browseStays' },
]

export const DISCOVER_FOOTER_LINKS = [
  { to: CONSUMER_ROUTES.search, label: 'Explore' },
  { to: CONSUMER_ROUTES.search, label: 'Neighborhoods' },
  { to: CONSUMER_ROUTES.search, label: 'Agencies' },
  { to: CONSUMER_ROUTES.search, label: 'Agents' },
  { to: CONSUMER_ROUTES.search, label: 'Services' },
  { to: CONSUMER_ROUTES.compare, label: 'Compare' },
]

export const SITEMAP_LINKS = [
  { to: CONSUMER_ROUTES.home, label: 'Home' },
  { to: CONSUMER_ROUTES.search, label: 'Explore listings' },
  { to: CONSUMER_HUB_PATH, label: 'My account' },
  { to: BUY_HUB_PATH, label: 'Buy' },
  { to: RENT_HUB_PATH, label: 'Rent' },
  { to: LEASE_HUB_PATH, label: 'Lease' },
  { to: STAY_HUB_PATH, label: 'Short stays' },
  { to: CONSUMER_ROUTES.wallet, label: 'Wallet' },
  { to: CONSUMER_ROUTES.messages, label: 'Messages' },
  { to: CONSUMER_ROUTES.profile, label: 'Profile' },
  { to: CONSUMER_ROUTES.profile, label: 'Help centre' },
]
