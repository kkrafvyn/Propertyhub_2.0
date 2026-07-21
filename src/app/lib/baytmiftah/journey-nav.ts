/**
 * Consumer journey links — Buy, Rent, Lease under /consumer/*.
 * Labels use i18n keys; call mapJourneyLinks(links, t) before rendering.
 */

import { exploreModeUrl } from './explore-filters'
import { CONSUMER_ROUTES } from '../consumer-routes'

export { exploreModeUrl }

export const BUY_HUB_PATH = CONSUMER_ROUTES.applications
export const RENT_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=rental`
export const LEASE_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=lease`
export const CONSUMER_HUB_PATH = CONSUMER_ROUTES.profile
export const STAY_HUB_PATH = `${CONSUMER_ROUTES.search}?listingType=short_stay`
export const INVEST_HUB_PATH = CONSUMER_ROUTES.profile

export function mapJourneyLinks(links, t) {
  return links.map(({ to, labelKey, descKey, label, desc }) => ({
    to,
    label: labelKey ? t(labelKey) : label,
    desc: descKey ? t(descKey) : desc,
  }))
}

export const BUY_JOURNEY_LINKS = [
  { to: '/saved', labelKey: 'buyerHub.links.saved.label', descKey: 'buyerHub.links.saved.desc' },
  { to: '/trips', labelKey: 'buyerHub.links.trips.label', descKey: 'buyerHub.links.trips.desc' },
  { to: '/offers', labelKey: 'buyerHub.links.offers.label', descKey: 'buyerHub.links.offers.desc' },
  { to: '/transactions', labelKey: 'buyerHub.links.transactions.label', descKey: 'buyerHub.links.transactions.desc' },
  { to: '/documents', labelKey: 'buyerHub.links.documents.label', descKey: 'buyerHub.links.documents.desc' },
  { to: '/buyer/finance', labelKey: 'buyerHub.links.finance.label', descKey: 'buyerHub.links.finance.desc' },
  { to: '/buyer/advisor', labelKey: 'buyerHub.links.advisor.label', descKey: 'buyerHub.links.advisor.desc' },
  { to: '/compare', labelKey: 'buyerHub.links.compare.label', descKey: 'buyerHub.links.compare.desc' },
  { to: '/neighborhoods', labelKey: 'buyerHub.links.neighborhoods.label', descKey: 'buyerHub.links.neighborhoods.desc' },
  { to: '/profile/kyc', labelKey: 'consumer.journeys.buy.kyc.label', descKey: 'consumer.journeys.buy.kyc.desc' },
]

export const RENT_JOURNEY_LINKS = [
  { to: exploreModeUrl('rent'), labelKey: 'consumer.journeys.rent.browseRent.label', descKey: 'consumer.journeys.rent.browseRent.desc' },
  { to: exploreModeUrl('lease'), labelKey: 'consumer.journeys.rent.browseLease.label', descKey: 'consumer.journeys.rent.browseLease.desc' },
  { to: '/renter/apply', labelKey: 'consumer.journeys.rent.apply.label', descKey: 'consumer.journeys.rent.apply.desc' },
  { to: '/saved', labelKey: 'buyerHub.links.saved.label', descKey: 'consumer.journeys.rent.saved.desc' },
  { to: '/trips', labelKey: 'buyerHub.links.trips.label', descKey: 'consumer.journeys.rent.trips.desc' },
  { to: LEASE_HUB_PATH, labelKey: 'profileNav.leaseJourney', descKey: 'consumer.journeys.rent.myLease.desc' },
]

export const LEASE_JOURNEY_LINKS = [
  { to: '/renter/leases', labelKey: 'workspace.nav.leases', descKey: 'hubs.renter.leases.subtitle' },
  { to: '/renter/payments', labelKey: 'workspace.nav.rentPayments', descKey: 'hubs.renter.payments.subtitle' },
  { to: '/renter/utilities', labelKey: 'workspace.nav.utilities', descKey: 'hubs.renter.utilities.subtitle' },
  { to: '/renter/credit', labelKey: 'workspace.nav.credit', descKey: 'hubs.renter.credit.subtitle' },
  { to: '/renter/maintenance', labelKey: 'workspace.nav.maintenance', descKey: 'hubs.renter.maintenance.subtitle' },
  { to: '/renter/sign', labelKey: 'workspace.nav.leaseSigning', descKey: 'hubs.renter.leaseSigning.subtitle' },
  { to: '/renter/renewal', labelKey: 'consumer.journeys.lease.renewal.label', descKey: 'consumer.journeys.lease.renewal.desc' },
  { to: '/tenant', labelKey: 'profileNav.tenantPortal', descKey: 'consumer.journeys.lease.tenant.desc' },
  { to: '/my-home', labelKey: 'profileNav.smartResident', descKey: 'consumer.journeys.lease.myHome.desc' },
  { to: '/documents', labelKey: 'profileNav.documentVault', descKey: 'buyerHub.links.documents.desc' },
]

export const STAY_JOURNEY_LINKS = [
  { to: '/trips', labelKey: 'consumer.journeys.stay.trips.label', descKey: 'consumer.journeys.stay.trips.desc' },
  { to: exploreModeUrl('shortStay'), labelKey: 'consumer.journeys.stay.browse.label', descKey: 'consumer.journeys.stay.browse.desc' },
]

export const INVEST_JOURNEY_LINKS = [
  { to: '/investment', labelKey: 'profileNav.investmentCenter', descKey: 'consumer.journeys.invest.center.desc' },
  { to: '/investment/roi', labelKey: 'consumer.journeys.invest.roi.label', descKey: 'consumer.journeys.invest.roi.desc' },
  { to: '/intelligence', labelKey: 'profileNav.intelligenceHub', descKey: 'consumer.journeys.invest.intel.desc' },
]

export const CONSUMER_HUB_LINKS = [
  { to: BUY_HUB_PATH, labelKey: 'profileNav.buyJourney', descKey: 'consumer.journeys.hub.buy.desc' },
  { to: RENT_HUB_PATH, labelKey: 'profileNav.rentJourney', descKey: 'consumer.journeys.hub.rent.desc' },
  { to: LEASE_HUB_PATH, labelKey: 'profileNav.leaseJourney', descKey: 'consumer.journeys.hub.lease.desc' },
  { to: STAY_HUB_PATH, labelKey: 'consumer.journeys.stay.title', descKey: 'consumer.journeys.hub.stay.desc' },
  { to: INVEST_HUB_PATH, labelKey: 'consumer.journeys.invest.title', descKey: 'consumer.journeys.hub.invest.desc' },
  { to: '/tenant', labelKey: 'profileNav.tenantPortal', descKey: 'consumer.journeys.hub.tenant.desc' },
  { to: '/my-home', labelKey: 'profileNav.smartResident', descKey: 'consumer.journeys.hub.myHome.desc' },
  { to: '/wallet', labelKey: 'profileNav.wallet', descKey: 'consumer.journeys.hub.wallet.desc' },
  { to: '/host', labelKey: 'profileNav.hostWorkspace', descKey: 'consumer.journeys.hub.host.desc' },
]

export const BUY_MOBILE_TILES = [
  { to: '/saved', labelKey: 'consumer.journeys.mobile.saved' },
  { to: '/trips', labelKey: 'consumer.journeys.mobile.trips' },
  { to: '/offers', labelKey: 'consumer.journeys.mobile.offers' },
  { to: '/transactions', labelKey: 'consumer.journeys.mobile.transactions' },
  { to: '/buyer/advisor', labelKey: 'consumer.journeys.mobile.advisor' },
  { to: '/buyer/finance', labelKey: 'consumer.journeys.mobile.finance' },
  { to: '/compare', labelKey: 'consumer.journeys.mobile.compare' },
  { to: '/neighborhoods', labelKey: 'consumer.journeys.mobile.areas' },
  { to: '/profile/kyc', labelKey: 'consumer.journeys.mobile.kyc' },
]

export const RENT_MOBILE_TILES = [
  { to: exploreModeUrl('rent'), labelKey: 'consumer.journeys.mobile.rentals' },
  { to: exploreModeUrl('lease'), labelKey: 'consumer.journeys.mobile.forLease' },
  { to: '/renter/apply', labelKey: 'consumer.journeys.mobile.apply' },
  { to: '/saved', labelKey: 'consumer.journeys.mobile.saved' },
  { to: '/trips', labelKey: 'consumer.journeys.mobile.viewings' },
  { to: LEASE_HUB_PATH, labelKey: 'consumer.journeys.mobile.myLease' },
]

export const LEASE_MOBILE_TILES = [
  { to: '/renter/leases', labelKey: 'consumer.journeys.mobile.leases' },
  { to: '/renter/payments', labelKey: 'consumer.journeys.mobile.payments' },
  { to: '/renter/utilities', labelKey: 'consumer.journeys.mobile.utilities' },
  { to: '/renter/credit', labelKey: 'consumer.journeys.mobile.credit' },
  { to: '/renter/maintenance', labelKey: 'consumer.journeys.mobile.maintenance' },
  { to: '/renter/sign', labelKey: 'consumer.journeys.mobile.sign' },
  { to: '/renter/renewal', labelKey: 'consumer.journeys.mobile.renewal' },
  { to: '/tenant', labelKey: 'consumer.journeys.mobile.tenant' },
  { to: '/my-home', labelKey: 'consumer.journeys.mobile.myHome' },
]

export const STAY_MOBILE_TILES = [
  { to: '/trips', labelKey: 'consumer.journeys.mobile.trips' },
  { to: exploreModeUrl('shortStay'), labelKey: 'consumer.journeys.mobile.browseStays' },
]

export const INVEST_MOBILE_TILES = [
  { to: '/investment', labelKey: 'consumer.journeys.mobile.portfolio' },
  { to: '/investment/roi', labelKey: 'consumer.journeys.mobile.roi' },
  { to: '/intelligence', labelKey: 'consumer.journeys.mobile.market' },
]

export const DISCOVER_FOOTER_LINKS = [
  { to: '/explore', label: 'Explore' },
  { to: '/neighborhoods', label: 'Neighborhoods' },
  { to: '/agencies', label: 'Agencies' },
  { to: '/agents', label: 'Agents' },
  { to: '/services', label: 'Services' },
  { to: '/compare', label: 'Compare' },
]

export const SITEMAP_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/explore', label: 'Explore listings' },
  { to: CONSUMER_HUB_PATH, label: 'My account' },
  { to: BUY_HUB_PATH, label: 'Buy' },
  { to: RENT_HUB_PATH, label: 'Rent' },
  { to: LEASE_HUB_PATH, label: 'Lease' },
  { to: STAY_HUB_PATH, label: 'Short stays' },
  { to: INVEST_HUB_PATH, label: 'Invest' },
  { to: '/wallet', label: 'Wallet' },
  { to: '/messages', label: 'Messages' },
  { to: '/profile', label: 'Profile' },
  { to: '/help', label: 'Help centre' },
]
