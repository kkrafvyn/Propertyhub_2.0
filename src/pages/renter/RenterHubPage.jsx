import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, StatCard, StatGrid } from '../../components/ui/AirbnbUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchRenterDashboard } from '../../services/renter-service'
import { fetchTenantDashboard } from '../../services/tenant-intelligence-service'

function RenterHub() {
  const { t } = useTranslation()
  const [profile, setProfile] = useState(null)
  const [tenantIntel, setTenantIntel] = useState(null)

  useEffect(() => {
    fetchRenterDashboard().then(({ profile: p }) => setProfile(p))
    fetchTenantDashboard().then(setTenantIntel)
  }, [])

  const links = [
    { to: '/renter/leases', label: t('hubs.renter.leases.title'), desc: t('hubs.renter.leases.subtitle') },
    { to: '/renter/payments', label: t('hubs.renter.payments.title'), desc: t('hubs.renter.payments.subtitle') },
    { to: '/renter/utilities', label: 'Utilities', desc: 'ECG, water, internet & gas' },
    { to: '/renter/credit', label: 'Housing credit', desc: 'Your rental reliability score' },
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
      {tenantIntel && (
        <StatGrid cols={3}>
          <StatCard label="Housing credit score" value={tenantIntel.credit_score} />
          <StatCard label="Risk band" value={tenantIntel.risk_band?.replace(/_/g, ' ')} />
          <StatCard label="Eligibility" value={tenantIntel.eligibility?.slice(0, 24) ?? 'Standard'} />
        </StatGrid>
      )}
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
