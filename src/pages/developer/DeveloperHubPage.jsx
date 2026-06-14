import { useEffect, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchDeveloperDashboard } from '../../services/developer-service'

const links = [
  { to: '/developer/projects', label: 'Projects', desc: 'Active developments and unit inventory' },
  { to: '/developer/construction', label: 'Construction tracking', desc: 'Milestones and progress' },
  { to: '/developer/buyers', label: 'Buyer portal', desc: 'Pre-sales and contract stages' },
]

function Hub() {
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchDeveloperDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  return (
    <DeveloperShell titleKey="hubs.developer.hub.title" subtitle={profile?.name || 'Project management'}>
      {profile && (
        <StatGrid>
          <StatCard label="Active projects" value={profile.activeProjects} />
          <StatCard label="Total units" value={profile.unitsTotal} />
          <StatCard label="Units sold" value={profile.unitsSold} />
          <StatCard label="Avg progress" value={profile.constructionProgress} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </DeveloperShell>
  )
}

export default function DeveloperHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}
