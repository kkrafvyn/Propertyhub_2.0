import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import {
  MobileBadge,
  MobileCard,
  MobileHubTile,
  MobilePrimaryButton,
  MobileTextLink,
} from '../../components/ui/MobileUI'
import { IconCard, IconDocument, IconPen, IconWrench } from '../../components/icons'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchRenterDashboard, fetchRentPayments } from '../../services/renter-service'

function RenterHome() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)
  const links = [
    { to: '/m/renter/leases', label: t('hubs.renter.leases.title'), Icon: IconDocument },
    { to: '/m/renter/payments', label: t('hubs.renter.payments.title'), Icon: IconCard },
    { to: '/m/renter/maintenance', label: t('hubs.renter.maintenance.title'), Icon: IconWrench },
    { to: '/m/renter/sign', label: t('hubs.renter.leaseSigning.title'), Icon: IconPen },
  ]

  useEffect(() => {
    fetchRenterDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.renterWorkspace')} subtitle={profile?.unit || t('mobile.yourRental')} backTo="/m/profile" />
      <section className="space-y-4 px-4 pb-6">
        {profile && (
          <MobileCard>
            <p className="text-sm text-ink-secondary">Monthly rent</p>
            <p className="text-2xl font-semibold text-ink">GHS {profile.rentAmount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-ink-secondary">
              Due day {profile.rentDueDay} · Lease ends {profile.leaseEnd}
            </p>
          </MobileCard>
        )}
        <div className="grid grid-cols-2 gap-3">
          {links.map((item) => (
            <MobileHubTile key={item.to} {...item} />
          ))}
        </div>
        <MobileTextLink to="/renter" className="block text-center">Open full renter workspace →</MobileTextLink>
      </section>
    </MobileShell>
  )
}

function RenterPaymentsMobile() {
  const { t } = useTranslation()
  const [payments, setPayments] = useState([])

  useEffect(() => {
    fetchRentPayments().then(({ payments: rows }) => setPayments(rows))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.rentPayments')} backTo="/m/renter" />
      <section className="space-y-3 px-4 pb-6">
        {payments.map((p) => (
          <MobileCard key={p.id}>
            <div className="flex justify-between">
              <p className="font-semibold text-ink">{p.period}</p>
              <MobileBadge tone={p.status === 'paid' ? 'success' : 'accent'}>{p.status}</MobileBadge>
            </div>
            <p className="mt-1 font-semibold text-ink">GHS {p.amount.toLocaleString()}</p>
            {p.status === 'due' && (
              <MobilePrimaryButton className="mt-3 w-full">Pay now</MobilePrimaryButton>
            )}
          </MobileCard>
        ))}
      </section>
    </MobileShell>
  )
}

function RenterLeasesMobile() {
  const { t } = useTranslation()
  return (
    <MobileShell hideNav>
      <MobileHeader title={t('hubs.renter.leases.title')} backTo="/m/renter" />
      <section className="px-4 pb-6">
        <MobilePrimaryButton as={Link} to="/renter/leases">View all leases</MobilePrimaryButton>
      </section>
    </MobileShell>
  )
}

function RenterMaintenanceMobile() {
  const { t } = useTranslation()
  return (
    <MobileShell hideNav>
      <MobileHeader title={t('hubs.renter.maintenance.title')} backTo="/m/renter" />
      <section className="px-4 pb-6">
        <MobilePrimaryButton as={Link} to="/renter/maintenance">Submit request</MobilePrimaryButton>
      </section>
    </MobileShell>
  )
}

function RenterSignMobile() {
  const { t } = useTranslation()
  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.leaseSigning')} backTo="/m/renter" />
      <section className="px-4 pb-6">
        <MobilePrimaryButton as={Link} to="/renter/sign">Sign documents</MobilePrimaryButton>
      </section>
    </MobileShell>
  )
}

export function MobileRenterHomePage() {
  return <ProtectedRoute><RenterHome /></ProtectedRoute>
}

export function MobileRenterPaymentsPage() {
  return <ProtectedRoute><RenterPaymentsMobile /></ProtectedRoute>
}

export function MobileRenterLeasesPage() {
  return <ProtectedRoute><RenterLeasesMobile /></ProtectedRoute>
}

export function MobileRenterMaintenancePage() {
  return <ProtectedRoute><RenterMaintenanceMobile /></ProtectedRoute>
}

export function MobileRenterSignPage() {
  return <ProtectedRoute><RenterSignMobile /></ProtectedRoute>
}
