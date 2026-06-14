import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchRenterDashboard } from '../../services/renter-service'

const links = [
  { to: '/renter/leases', label: 'My leases', desc: 'Active and past rental agreements' },
  { to: '/renter/payments', label: 'Rent payments', desc: 'Pay rent and view history' },
  { to: '/renter/maintenance', label: 'Maintenance', desc: 'Submit and track repair requests' },
  { to: '/renter/sign', label: 'Digital signing', desc: 'Sign lease documents' },
  { to: '/documents', label: 'Document vault', desc: 'All rental documents' },
  { to: '/', label: 'Browse rentals', desc: 'Find your next home' },
]

function RenterHub() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchRenterDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  return (
    <RenterShell
      title="Renter workspace"
      subtitle={profile ? `${profile.unit} · GHS ${profile.rentAmount.toLocaleString()}/mo` : 'Your rental journey'}
    >
      {profile && (
        <StatGrid cols={3}>
          <StatCard label="Current rent" value={`GHS ${profile.rentAmount.toLocaleString()}`} />
          <StatCard label="Lease ends" value={profile.leaseEnd} />
          <StatCard label="Landlord" value={profile.landlord} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </RenterShell>
  )
}

export default function RenterHubPage() {
  return <ProtectedRoute><RenterHub /></ProtectedRoute>
}
