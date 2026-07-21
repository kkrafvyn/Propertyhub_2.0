import { WorkspaceShell } from './WorkspaceShell'

const INVESTMENT_LINKS = [
  { to: '/investment', label: 'Overview', end: true },
  { to: '/investment/roi', label: 'ROI analysis' },
  { to: '/investment/portfolio', label: 'Portfolio' },
  { to: '/investment/deals', label: 'Deal room' },
  { to: '/investment/forecast', label: 'Forecast' },
  { to: '/intelligence/market', label: 'Market data' },
]

export default function InvestmentShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="Investment center"
      homePath="/investment"
      links={INVESTMENT_LINKS}
      {...props}
    />
  )
}
