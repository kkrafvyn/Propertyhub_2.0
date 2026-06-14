import DesktopShell, { CompactSearch } from '../../components/DesktopShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { HubLinkGrid, PageTitle } from '../../components/ui/AirbnbUI'

const links = [
  { to: '/saved', label: 'Saved properties', desc: 'Homes you have shortlisted' },
  { to: '/trips', label: 'Viewings & trips', desc: 'Scheduled property visits' },
  { to: '/offers', label: 'Offer room', desc: 'Submit and track offers' },
  { to: '/transactions', label: 'Transaction center', desc: 'Closing checklist and stages' },
  { to: '/documents', label: 'Document vault', desc: 'Titles, offers, and contracts' },
  { to: '/buyer/finance', label: 'Financing center', desc: 'Mortgages and partner banks' },
  { to: '/buyer/advisor', label: 'AI buyer advisor', desc: 'Pricing and neighborhood insights' },
  { to: '/compare', label: 'Compare', desc: 'Side-by-side property analysis' },
  { to: '/neighborhoods', label: 'Neighborhood intel', desc: 'Schools, safety, growth' },
]

function BuyerHub() {
  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle
        title="Buyer workspace"
        subtitle="Your purchase journey — from search to close."
      />
      <HubLinkGrid links={links} />
    </DesktopShell>
  )
}

export default function BuyerHubPage() {
  return <ProtectedRoute><BuyerHub /></ProtectedRoute>
}
