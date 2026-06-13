import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { IconCard, IconDocument, IconPen, IconWrench } from '../../components/icons'
import { fetchRenterDashboard, fetchRentPayments } from '../../services/renter-service'

const links = [
  { to: '/m/renter/leases', label: 'Leases', Icon: IconDocument },
  { to: '/m/renter/payments', label: 'Pay rent', Icon: IconCard },
  { to: '/m/renter/maintenance', label: 'Maintenance', Icon: IconWrench },
  { to: '/m/renter/sign', label: 'Sign lease', Icon: IconPen },
]

function RenterHome() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchRenterDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title="Renter App" subtitle={profile?.unit || 'Your rental'} />
      <section className="space-y-4 px-4 pb-6">
        {profile && (
          <div className="rounded-2xl bg-surface p-4 shadow-sm">
            <p className="text-sm text-ink-secondary">Monthly rent</p>
            <p className="text-2xl font-bold text-brand-dark">GHS {profile.rentAmount.toLocaleString()}</p>
            <p className="mt-1 text-xs text-ink-secondary">Due day {profile.rentDueDay} · Lease ends {profile.leaseEnd}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {links.map(({ to, label, Icon }) => (
            <Link key={to} to={to} className="rounded-2xl bg-surface p-4 shadow-sm">
              <Icon className="h-7 w-7 text-brand-dark" />
              <p className="mt-2 font-semibold">{label}</p>
            </Link>
          ))}
        </div>
        <Link to="/renter" className="block text-center text-sm text-brand-dark underline">Open full renter workspace →</Link>
      </section>
    </MobileShell>
  )
}

function RenterPaymentsMobile() {
  const [payments, setPayments] = useState([])

  useEffect(() => {
    fetchRentPayments().then(({ payments: rows }) => setPayments(rows))
  }, [])

  return (
    <MobileShell hideNav>
      <MobileHeader title="Rent payments" backTo="/m/renter" />
      <section className="space-y-3 px-4 pb-6">
        {payments.map((p) => (
          <article key={p.id} className="rounded-2xl bg-surface p-4 shadow-sm">
            <div className="flex justify-between">
              <p className="font-semibold">{p.period}</p>
              <span className={`text-xs font-semibold capitalize ${p.status === 'paid' ? 'text-green-700' : 'text-brand-dark'}`}>{p.status}</span>
            </div>
            <p className="mt-1 font-bold text-brand-dark">GHS {p.amount.toLocaleString()}</p>
            {p.status === 'due' && (
              <button type="button" className="mt-3 w-full rounded-xl bg-brand-dark py-2.5 text-sm font-semibold text-brand">Pay now</button>
            )}
          </article>
        ))}
      </section>
    </MobileShell>
  )
}

function RenterLeasesMobile() {
  return (
    <MobileShell hideNav>
      <MobileHeader title="Leases" backTo="/m/renter" />
      <section className="px-4 pb-6">
        <Link to="/renter/leases" className="inline-block rounded-xl bg-brand-dark px-4 py-2 text-sm font-semibold text-brand">View all leases</Link>
      </section>
    </MobileShell>
  )
}

function RenterMaintenanceMobile() {
  return (
    <MobileShell hideNav>
      <MobileHeader title="Maintenance" backTo="/m/renter" />
      <section className="px-4 pb-6">
        <Link to="/renter/maintenance" className="inline-block rounded-xl bg-brand-dark px-4 py-2 text-sm font-semibold text-brand">Submit request</Link>
      </section>
    </MobileShell>
  )
}

function RenterSignMobile() {
  return (
    <MobileShell hideNav>
      <MobileHeader title="Lease signing" backTo="/m/renter" />
      <section className="px-4 pb-6">
        <Link to="/renter/sign" className="inline-block rounded-xl bg-brand-dark px-4 py-2 text-sm font-semibold text-brand">Sign documents</Link>
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
