import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { MobileHubTile, MobileTextLink } from '../../components/ui/MobileUI'
import { IconCard, IconHome, IconSparkle, IconUsers, IconLock } from '../../components/icons'
import { fetchWalletDashboard } from '../../services/wallet-service'
import { fetchHostDashboard } from '../../services/host-service'
import { fetchInvestmentDashboard } from '../../services/investment-service'

function MobileOsHub({ title, subtitle, tiles, desktopPath }) {
  return (
    <MobileShell>
      <MobileHeader title={title} subtitle={subtitle} />
      <div className="grid grid-cols-2 gap-3 px-4 pb-8">
        {tiles.map(({ to, label, Icon }) => (
          <MobileHubTile key={to} to={to} label={label} Icon={Icon} />
        ))}
      </div>
      {desktopPath && (
        <div className="px-4 pb-8">
          <MobileTextLink to={desktopPath}>Open full workspace on desktop</MobileTextLink>
        </div>
      )}
    </MobileShell>
  )
}

export function MobileConsumerHomePage() {
  const tiles = [
    { to: '/consumer/buy', label: 'Buy', Icon: IconHome },
    { to: '/consumer/rent', label: 'Rent', Icon: IconLock },
    { to: '/consumer/stay', label: 'Stays', Icon: IconSparkle },
    { to: '/consumer/invest', label: 'Invest', Icon: IconCard },
    { to: '/wallet', label: 'Wallet', Icon: IconCard },
    { to: '/tenant', label: 'Tenant', Icon: IconUsers },
  ]
  return <ProtectedRoute><MobileOsHub title="My BaytMiftah" subtitle="Buy · Rent · Stay · Invest" tiles={tiles} desktopPath="/consumer" /></ProtectedRoute>
}

export function MobileConsumerBuyPage() {
  const tiles = [
    { to: '/transactions', label: 'Transactions', Icon: IconCard },
    { to: '/offers', label: 'Offers', Icon: IconHome },
    { to: '/buyer/advisor', label: 'AI advisor', Icon: IconSparkle },
    { to: '/saved', label: 'Saved', Icon: IconHome },
  ]
  return <ProtectedRoute><MobileOsHub title="Buy" subtitle="Purchase workflows" tiles={tiles} /></ProtectedRoute>
}

export function MobileConsumerRentPage() {
  const tiles = [
    { to: '/renter/leases', label: 'Leases', Icon: IconLock },
    { to: '/renter/payments', label: 'Payments', Icon: IconCard },
    { to: '/renter/maintenance', label: 'Maintenance', Icon: IconSparkle },
    { to: '/tenant/visitors', label: 'Visitors', Icon: IconUsers },
  ]
  return <ProtectedRoute><MobileOsHub title="Rent" subtitle="Tenant workspace" tiles={tiles} /></ProtectedRoute>
}

export function MobileConsumerStayPage() {
  const tiles = [
    { to: '/trips', label: 'Trips', Icon: IconSparkle },
    { to: '/', label: 'Browse', Icon: IconHome },
    { to: '/host/reservations', label: 'Bookings', Icon: IconCard },
  ]
  return <ProtectedRoute><MobileOsHub title="Short stays" subtitle="Guest experiences" tiles={tiles} /></ProtectedRoute>
}

export function MobileWalletHomePage() {
  const [balance, setBalance] = useState(null)
  useEffect(() => {
    fetchWalletDashboard().then(({ wallet }) => setBalance(wallet))
  }, [])
  const tiles = [
    { to: '/wallet/transactions', label: 'Transactions', Icon: IconCard },
    { to: '/wallet/payouts', label: 'Payouts', Icon: IconCard },
    { to: '/wallet/escrow', label: 'Escrow', Icon: IconLock },
  ]
  return (
    <ProtectedRoute>
      <MobileOsHub
        title="Wallet"
        subtitle={balance ? `GHS ${balance.availableBalance?.toLocaleString()} available` : 'Real estate wallet'}
        tiles={tiles}
        desktopPath="/wallet"
      />
    </ProtectedRoute>
  )
}

export function MobileWalletTransactionsPage() {
  return <ProtectedRoute><MobileOsHub title="Transactions" subtitle="Ledger history" tiles={[]} desktopPath="/wallet/transactions" /></ProtectedRoute>
}

export function MobileHostHomePage() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    fetchHostDashboard().then(({ stats: s }) => setStats(s))
  }, [])
  const tiles = [
    { to: '/host/listings', label: 'Listings', Icon: IconHome },
    { to: '/host/calendar', label: 'Calendar', Icon: IconSparkle },
    { to: '/host/reservations', label: 'Reservations', Icon: IconUsers },
    { to: '/host/payouts', label: 'Payouts', Icon: IconCard },
    { to: '/host/list', label: 'Add listing', Icon: IconLock },
  ]
  return (
    <ProtectedRoute>
      <MobileOsHub
        title="Host"
        subtitle={stats ? `${stats.listings} listings · ${stats.upcomingReservations} bookings` : 'Host workspace'}
        tiles={tiles}
        desktopPath="/host"
      />
    </ProtectedRoute>
  )
}

export function MobileHostReservationsPage() {
  return <ProtectedRoute><MobileOsHub title="Reservations" subtitle="Manage guest bookings" tiles={[]} desktopPath="/host/reservations" /></ProtectedRoute>
}

export function MobileInvestmentHomePage() {
  const [portfolio, setPortfolio] = useState(null)
  useEffect(() => {
    fetchInvestmentDashboard().then(({ portfolio: p }) => setPortfolio(p))
  }, [])
  const tiles = [
    { to: '/investment/roi', label: 'ROI', Icon: IconSparkle },
    { to: '/investment/portfolio', label: 'Portfolio', Icon: IconCard },
    { to: '/intelligence', label: 'Market intel', Icon: IconHome },
  ]
  return (
    <ProtectedRoute>
      <MobileOsHub
        title="Invest"
        subtitle={portfolio ? `${portfolio.holdings} holdings` : 'Investment center'}
        tiles={tiles}
        desktopPath="/investment"
      />
    </ProtectedRoute>
  )
}

export function MobileTenantHomePage() {
  const tiles = [
    { to: '/renter/leases', label: 'Lease', Icon: IconLock },
    { to: '/tenant/visitors', label: 'Visitors', Icon: IconUsers },
    { to: '/tenant/access', label: 'Access', Icon: IconLock },
    { to: '/resident', label: 'Smart resident', Icon: IconSparkle },
  ]
  return <ProtectedRoute><MobileOsHub title="Tenant portal" subtitle="Renter tools" tiles={tiles} desktopPath="/tenant" /></ProtectedRoute>
}

export function MobileResidentHomePage() {
  const tiles = [
    { to: '/resident/access', label: 'Doors', Icon: IconLock },
    { to: '/resident/energy', label: 'Energy', Icon: IconSparkle },
    { to: '/resident/announcements', label: 'News', Icon: IconUsers },
  ]
  return <ProtectedRoute><MobileOsHub title="Smart resident" subtitle="Building access" tiles={tiles} desktopPath="/resident" /></ProtectedRoute>
}

export function MobileEnterpriseOrgsPage() {
  const tiles = [
    { to: '/enterprise/organizations', label: 'Organizations', Icon: IconUsers },
    { to: '/enterprise/users', label: 'Users', Icon: IconUsers },
    { to: '/enterprise/permissions', label: 'Permissions', Icon: IconLock },
  ]
  return <ProtectedRoute><MobileOsHub title="Enterprise" subtitle="Multi-org management" tiles={tiles} desktopPath="/enterprise/organizations" /></ProtectedRoute>
}
