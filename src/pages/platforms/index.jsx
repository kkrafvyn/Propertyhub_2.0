import PlatformHubPage from '../../components/PlatformHubPage'

export const platformPages = {
  renter: () => (
    <PlatformHubPage
      title="Renter App"
      subtitle="Lease management, rent payments, maintenance, and digital signing."
      features={['Rental search', 'Rent payments', 'Maintenance requests', 'Move-in checklist', 'Digital lease signing']}
      cta={{ to: '/', label: 'Browse rentals' }}
    />
  ),
  manage: () => (
    <PlatformHubPage
      title="Property Management"
      subtitle="Manage buildings, tenants, vendors, and rent collection."
      features={['Tenant management', 'Work orders', 'Inspection reports', 'Occupancy monitoring', 'Financial reporting']}
    />
  ),
  smart: () => (
    <PlatformHubPage
      title="Smart Property Platform"
      subtitle="Devices, automation, and energy monitoring for connected buildings."
      features={['Smart locks & cameras', 'Automation engine', 'Energy monitoring', 'Alerts & event logs']}
    />
  ),
  finance: () => (
    <PlatformHubPage
      title="Financial Services"
      subtitle="Mortgages, escrow, insurance, and commission settlement."
      features={['Mortgage marketplace', 'Escrow accounts', 'Rent collection', 'Property insurance']}
      cta={{ to: '/finance', label: 'Open financial services' }}
    />
  ),
  intelligence: () => (
    <PlatformHubPage
      title="Real Estate Intelligence"
      subtitle="Market data, AI valuation, and investor analytics."
      features={['Price trends & heatmaps', 'AI valuation engine', 'Cap rate & ROI tools', 'Neighborhood scores']}
      cta={{ to: '/neighborhoods', label: 'Neighborhood intelligence' }}
    />
  ),
  developer: () => (
    <PlatformHubPage
      title="Developer Platform"
      subtitle="Project management, unit inventory, and construction tracking."
      features={['Project dashboard', 'Construction progress', 'Buyer portal', 'Investor updates']}
    />
  ),
  enterprise: () => (
    <PlatformHubPage
      title="Enterprise Asset Management"
      subtitle="Multi-country portfolios for REITs, funds, and institutions."
      features={['Multi-country portfolios', 'ESG reporting', 'Risk analysis', 'Revenue forecasting']}
    />
  ),
}
