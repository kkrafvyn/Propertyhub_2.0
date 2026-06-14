import { useEffect, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { MobileHubTile, MobileTextLink } from '../../components/ui/MobileUI'
import {
  IconCard, IconDocument, IconOffice, IconSparkle, IconUsers, IconWrench,
} from '../../components/icons'
import { fetchAgencyDashboard } from '../../services/agency-service'
import { fetchFinanceDashboard } from '../../services/finance-service'

const workspaces = [
  {
    id: 'agency',
    title: 'Agency workspace',
    desktop: '/agency',
    links: [
      { to: '/agency/team', label: 'Team', Icon: IconUsers },
      { to: '/agency/branches', label: 'Branches', Icon: IconOffice },
      { to: '/agency/analytics', label: 'Analytics', Icon: IconSparkle },
    ],
  },
  {
    id: 'manage',
    title: 'Property management',
    desktop: '/manage',
    links: [
      { to: '/manage/tenants', label: 'Tenants', Icon: IconUsers },
      { to: '/manage/work-orders', label: 'Work orders', Icon: IconWrench },
      { to: '/manage/finance', label: 'Finance', Icon: IconCard },
    ],
  },
  {
    id: 'finance',
    title: 'Financial services',
    desktop: '/finance',
    links: [
      { to: '/finance/mortgages', label: 'Mortgages', Icon: IconDocument },
      { to: '/finance/escrow', label: 'Escrow', Icon: IconCard },
      { to: '/finance/rent-collection', label: 'Rent collection', Icon: IconCard },
    ],
  },
  {
    id: 'intelligence',
    title: 'Market intelligence',
    desktop: '/intelligence',
    links: [
      { to: '/intelligence/market', label: 'Market data', Icon: IconSparkle },
      { to: '/intelligence/heatmap', label: 'Heatmap', Icon: IconOffice },
      { to: '/intelligence/valuation', label: 'Valuation', Icon: IconDocument },
    ],
  },
  {
    id: 'developer',
    title: 'Developer platform',
    desktop: '/developer',
    links: [
      { to: '/developer/projects', label: 'Projects', Icon: IconOffice },
      { to: '/developer/construction', label: 'Construction', Icon: IconWrench },
      { to: '/developer/buyers', label: 'Buyers', Icon: IconUsers },
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise assets',
    desktop: '/enterprise',
    links: [
      { to: '/enterprise/portfolios', label: 'Portfolios', Icon: IconOffice },
      { to: '/enterprise/esg', label: 'ESG', Icon: IconSparkle },
      { to: '/enterprise/forecast', label: 'Forecast', Icon: IconDocument },
    ],
  },
]

function WorkspaceHome({ workspace }) {
  const [subtitle, setSubtitle] = useState('Mobile workspace')

  useEffect(() => {
    if (workspace.id === 'agency') {
      fetchAgencyDashboard().then(({ agency }) => setSubtitle(agency?.name ?? 'Agency'))
    }
    if (workspace.id === 'finance') {
      fetchFinanceDashboard().then(({ summary }) =>
        setSubtitle(`Escrow GHS ${(summary?.escrowTotal ?? 0).toLocaleString()}`),
      )
    }
  }, [workspace.id])

  return (
    <MobileShell hideNav>
      <MobileHeader title={workspace.title} subtitle={subtitle} backTo="/m/profile" />
      <section className="space-y-4 px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {workspace.links.map((item) => (
            <MobileHubTile key={item.to} {...item} />
          ))}
        </div>
        <MobileTextLink to={workspace.desktop} className="block text-center">
          Open full {workspace.title.toLowerCase()} →
        </MobileTextLink>
      </section>
    </MobileShell>
  )
}

function makePage(workspace) {
  return function Page() {
    return (
      <ProtectedRoute>
        <WorkspaceHome workspace={workspace} />
      </ProtectedRoute>
    )
  }
}

export const MobileAgencyPage = makePage(workspaces[0])
export const MobileManagePage = makePage(workspaces[1])
export const MobileFinancePage = makePage(workspaces[2])
export const MobileIntelligencePage = makePage(workspaces[3])
export const MobileDeveloperPage = makePage(workspaces[4])
export const MobileEnterprisePage = makePage(workspaces[5])
