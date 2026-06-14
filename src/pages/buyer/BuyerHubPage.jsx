import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, PageTitle } from '../../components/ui/AirbnbUI'
import { useTranslation } from '../../i18n/LocaleContext'

function BuyerHub() {
  const { t } = useTranslation()
  const links = [
    { to: '/saved', label: t('buyerHub.links.saved.label'), desc: t('buyerHub.links.saved.desc') },
    { to: '/trips', label: t('buyerHub.links.trips.label'), desc: t('buyerHub.links.trips.desc') },
    { to: '/offers', label: t('buyerHub.links.offers.label'), desc: t('buyerHub.links.offers.desc') },
    { to: '/transactions', label: t('buyerHub.links.transactions.label'), desc: t('buyerHub.links.transactions.desc') },
    { to: '/documents', label: t('buyerHub.links.documents.label'), desc: t('buyerHub.links.documents.desc') },
    { to: '/buyer/finance', label: t('buyerHub.links.finance.label'), desc: t('buyerHub.links.finance.desc') },
    { to: '/buyer/advisor', label: t('buyerHub.links.advisor.label'), desc: t('buyerHub.links.advisor.desc') },
    { to: '/compare', label: t('buyerHub.links.compare.label'), desc: t('buyerHub.links.compare.desc') },
    { to: '/neighborhoods', label: t('buyerHub.links.neighborhoods.label'), desc: t('buyerHub.links.neighborhoods.desc') },
  ]

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('buyerHub.title')} subtitle={t('buyerHub.subtitle')} />
      <HubLinkGrid links={links} />
    </DesktopShell>
  )
}

export default function BuyerHubPage() {
  return <ProtectedRoute><BuyerHub /></ProtectedRoute>
}
