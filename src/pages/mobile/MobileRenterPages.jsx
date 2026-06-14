import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import IntegrationsBanner from '../../components/IntegrationsBanner'
import {
  MobileBadge,
  MobileCard,
  MobileHubTile,
  MobilePrimaryButton,
  MobileTextLink,
} from '../../components/ui/MobileUI'
import { IconCard, IconDocument, IconPen, IconWrench } from '../../components/icons'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  fetchRenterDashboard,
  fetchRentPayments,
  fetchLeases,
  fetchMaintenanceRequests,
  submitMaintenanceRequest,
  fetchLeaseDocuments,
  signLeaseDocument,
} from '../../services/renter-service'
import { createSigningSession } from '../../services/docusign-service'
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
            <p className="text-sm text-ink-secondary">{t('mobile.monthlyRent')}</p>
            <p className="text-2xl font-semibold text-ink">GHS {profile.rentAmount.toLocaleString()}</p>
          </MobileCard>
        )}
        <div className="grid grid-cols-2 gap-3">
          {links.map((item) => (
            <MobileHubTile key={item.to} {...item} />
          ))}
        </div>
      </section>
    </MobileShell>
  )
}

function RenterPaymentsMobile() {
  const { t } = useTranslation()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState('')
  const [ussdModal, setUssdModal] = useState(null)
  const provider = getDefaultProvider()

  useEffect(() => {
    fetchRentPayments().then(({ payments: rows }) => setPayments(rows))
  }, [])

  async function handlePay(p) {
    setLoading(p.id)
    setMessage('')
    const result = await payRent({ paymentId: p.id, amount: p.amount, provider, metadata: { period: p.period } })
    if (result.message && !result.checkout_url) setMessage(result.message)
    setLoading(null)
  }

  async function handleUssd(p) {
    setLoading(p.id)
    const result = await initiateUssdPayment({ paymentId: p.id, amount: p.amount, phone: '' })
    setUssdModal({ payment: p, ussd: result.ussd, message: result.message })
    setLoading(null)
  }

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.rentPayments')} backTo="/m/renter" />
      <section className="space-y-3 px-4 pb-6">
        <IntegrationsBanner showPayments />
        {message && <p className="text-sm text-ink-secondary">{message}</p>}
        {payments.map((p) => (
          <MobileCard key={p.id}>
            <div className="flex justify-between">
              <p className="font-semibold text-ink">{p.period}</p>
              <MobileBadge tone={p.status === 'paid' ? 'success' : 'accent'}>{p.status}</MobileBadge>
            </div>
            <p className="mt-1 font-semibold text-ink">GHS {p.amount.toLocaleString()}</p>
            {p.status === 'due' && (
              <div className="mt-3 flex flex-col gap-2">
                <MobilePrimaryButton type="button" onClick={() => handlePay(p)} disabled={loading === p.id} className="w-full">
                  {loading === p.id ? t('mobile.redirecting') : t('mobile.payNow')}
                </MobilePrimaryButton>
                <button type="button" onClick={() => handleUssd(p)} disabled={loading === p.id} className="w-full rounded-lg border border-surface-border py-2.5 text-sm font-semibold">
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
            <code className="block rounded-lg bg-surface-subtle px-4 py-3 text-center text-xl font-bold">{ussdModal.ussd}</code>
            <MobilePrimaryButton type="button" onClick={() => setUssdModal(null)} className="mt-4 w-full">{t('common.close')}</MobilePrimaryButton>
          </div>
        </div>
      )}
    </MobileShell>
  )
}

function RenterLeasesMobile() {
  const { t } = useTranslation()
  const [leases, setLeases] = useState([])

  useEffect(() => {
    fetchLeases().then(({ leases: rows }) => setLeases(rows))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('hubs.renter.leases.title')} backTo="/m/renter" />
      <section className="space-y-3 px-4 pb-6">
        {leases.map((lease) => (
          <MobileCard key={lease.id}>
            <p className="font-semibold">{lease.property}</p>
            <p className="text-sm text-ink-secondary">{lease.landlord}</p>
            <p className="mt-2 text-sm">GHS {lease.rent.toLocaleString()} · {lease.start} – {lease.end}</p>
            <MobileBadge tone="neutral" className="mt-2">{lease.status}</MobileBadge>
          </MobileCard>
        ))}
      </section>
    </MobileShell>
  )
}

function RenterMaintenanceMobile() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')

  useEffect(() => {
    fetchMaintenanceRequests().then(({ requests: rows }) => setRequests(rows))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    await submitMaintenanceRequest({ title, category: 'General', priority: 'medium' })
    const { requests: rows } = await fetchMaintenanceRequests()
    setRequests(rows)
    setShowForm(false)
    setTitle('')
  }

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('hubs.renter.maintenance.title')} backTo="/m/renter" />
      <section className="space-y-3 px-4 pb-6">
        <MobilePrimaryButton type="button" onClick={() => setShowForm(true)} className="w-full">{t('mobile.newRequest')}</MobilePrimaryButton>
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-2">
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('mobile.issuePlaceholder')} className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm" />
            <MobilePrimaryButton type="submit" className="w-full">{t('mobile.submit')}</MobilePrimaryButton>
          </form>
        )}
        {requests.map((r) => (
          <MobileCard key={r.id}>
            <p className="font-semibold">{r.title}</p>
            <p className="text-sm text-ink-secondary">{r.status} · {r.submitted}</p>
          </MobileCard>
        ))}
      </section>
    </MobileShell>
  )
}

function RenterSignMobile() {
  const { t } = useTranslation()
  const [documents, setDocuments] = useState([])
  const [signing, setSigning] = useState(null)

  useEffect(() => {
    fetchLeaseDocuments().then(({ documents: rows }) => setDocuments(rows))
  }, [])

  async function handleSign(doc) {
    setSigning(doc.id)
    const session = await createSigningSession(doc.id, doc.name)
    if (session.signingUrl && !session.demo) {
      window.location.href = session.signingUrl
    } else {
      await signLeaseDocument(doc.id)
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, status: 'signed' } : d)))
    }
    setSigning(null)
  }

  return (
    <MobileShell hideNav>
      <MobileHeader title={t('mobile.leaseSigning')} backTo="/m/renter" />
      <section className="space-y-3 px-4 pb-6">
        {documents.map((doc) => (
          <MobileCard key={doc.id}>
            <p className="font-semibold">{doc.name}</p>
            {doc.status === 'signed' ? (
              <MobileBadge tone="success" className="mt-2">{t('mobile.signed')}</MobileBadge>
            ) : (
              <MobilePrimaryButton type="button" onClick={() => handleSign(doc)} disabled={signing === doc.id} className="mt-3 w-full">
                {signing === doc.id ? t('extensions.docusign.signing') : t('extensions.docusign.signViaDocusign')}
              </MobilePrimaryButton>
            )}
          </MobileCard>
        ))}
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
