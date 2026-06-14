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
import { payRent } from '../../services/payments-service'
import { initiateUssdPayment } from '../../services/ussd-service'
import { getDefaultProvider } from '../../lib/payment-providers'

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
  const [loading, setLoading] = useState(null)
  const [ussdModal, setUssdModal] = useState(null)
  const provider = getDefaultProvider()

  useEffect(() => {
    fetchRentPayments().then(({ payments: rows }) => setPayments(rows))
  }, [])

  async function handlePay(p) {
    setLoading(p.id)
    await payRent({
      paymentId: p.id,
      amount: p.amount,
      provider,
      metadata: { period: p.period },
    })
    setLoading(null)
  }

  async function handleUssd(p) {
    setLoading(p.id)
    const result = await initiateUssdPayment({
      paymentId: p.id,
      amount: p.amount,
      phone: '',
    })
    setUssdModal({ payment: p, ussd: result.ussd, message: result.message })
    setLoading(null)
  }

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
              <div className="mt-3 flex flex-col gap-2">
                <MobilePrimaryButton
                  type="button"
                  onClick={() => handlePay(p)}
                  disabled={loading === p.id}
                  className="w-full"
                >
                  {loading === p.id ? 'Redirecting…' : 'Pay now'}
                </MobilePrimaryButton>
                <button
                  type="button"
                  onClick={() => handleUssd(p)}
                  disabled={loading === p.id}
                  className="w-full rounded-lg border border-surface-border py-2.5 text-sm font-semibold"
                >
                  {t('extensions.ussd.payViaUssd')}
                </button>
              </div>
            )}
          </MobileCard>
        ))}
      </section>

      {ussdModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-surface p-6">
            <h3 className="text-lg font-semibold">{t('extensions.ussd.title')}</h3>
            <p className="mt-2 text-sm text-ink-secondary">{ussdModal.message || t('extensions.ussd.instructions')}</p>
            <code className="mt-4 block rounded-lg bg-surface-subtle px-4 py-3 text-center text-xl font-bold">{ussdModal.ussd}</code>
            <MobilePrimaryButton type="button" onClick={() => setUssdModal(null)} className="mt-4 w-full">
              {t('common.close')}
            </MobilePrimaryButton>
          </div>
        </div>
      )}
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
