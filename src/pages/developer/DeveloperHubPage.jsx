import { useEffect, useMemo, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { fetchDeveloperDashboard } from '../../services/developer-service'
import { useTranslation } from '../../i18n/LocaleContext'

function Hub() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)

  const links = useMemo(() => [
    { to: '/developer/projects', label: t('hubs.developer.projects.title'), desc: t('hubs.developer.projects.subtitle') },
    { to: '/developer/construction', label: t('hubs.developer.construction.title'), desc: t('hubs.developer.construction.subtitle') },
    { to: '/developer/buyers', label: t('hubs.developer.buyers.title'), desc: t('hubs.developer.buyers.subtitle') },
    { to: '/developer/platform-api', label: t('hubs.developer.platformApi.title'), desc: t('hubs.developer.platformApi.subtitle') },
  ], [t])

  useEffect(() => {
    fetchDeveloperDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  return (
    <DeveloperShell titleKey="hubs.developer.hub.title" subtitle={profile?.name || t('hubs.developer.hub.subtitle')}>
      {profile && (
        <StatGrid>
          <StatCard label={t('hubs.developer.hub.stats.activeProjects')} value={profile.activeProjects} />
          <StatCard label={t('hubs.developer.hub.stats.totalUnits')} value={profile.unitsTotal} />
          <StatCard label={t('hubs.developer.hub.stats.unitsSold')} value={profile.unitsSold} />
          <StatCard label={t('hubs.developer.hub.stats.avgProgress')} value={profile.constructionProgress} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </DeveloperShell>
  )
}

export default function DeveloperHubPage() {
  return <ProtectedRoute><Hub /></ProtectedRoute>
}
