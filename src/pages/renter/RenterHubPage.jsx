import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchRenterDashboard } from '../../services/renter-service'

function RenterHub() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    fetchRenterDashboard().then(({ profile: p }) => setProfile(p))
  }, [])

  const links = [
    { to: '/renter/leases', label: t('hubs.renter.leases.title'), desc: t('hubs.renter.leases.subtitle') },
    { to: '/renter/payments', label: t('hubs.renter.payments.title'), desc: t('hubs.renter.payments.subtitle') },
    { to: '/renter/maintenance', label: t('hubs.renter.maintenance.title'), desc: t('hubs.renter.maintenance.subtitle') },
    { to: '/renter/sign', label: t('hubs.renter.leaseSigning.title'), desc: t('hubs.renter.leaseSigning.subtitle') },
    { to: '/documents', label: t('profileNav.documentVault'), desc: t('buyerHub.links.documents.desc') },
    { to: '/', label: t('common.browseHomes'), desc: t('mobile.findNextHome') },
  ]

  return (
    <RenterShell
      titleKey="hubs.renter.hub.title"
      subtitleKey={profile ? 'hubs.renter.hub.loadedSubtitle' : 'hubs.renter.hub.subtitle'}
      subtitleVars={profile ? { unit: profile.unit, rent: profile.rentAmount.toLocaleString() } : undefined}
    >
      {profile && (
        <StatGrid cols={3}>
          <StatCard label={t('hubs.renter.hub.stats.currentRent')} value={`GHS ${profile.rentAmount.toLocaleString()}`} />
          <StatCard label={t('hubs.renter.hub.stats.leaseEnds')} value={profile.leaseEnd} />
          <StatCard label={t('hubs.renter.hub.stats.landlord')} value={profile.landlord} />
        </StatGrid>
      )}
      <HubLinkGrid links={links} />
    </RenterShell>
  )
}

export default function RenterHubPage() {
  return <ProtectedRoute><RenterHub /></ProtectedRoute>
}
