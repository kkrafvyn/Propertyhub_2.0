import { WorkspaceShell } from './WorkspaceShell'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'
import { WORKSPACE_ENTRY_PATH } from '../../../lib/workspace'

const INVESTMENT_LINKS = [
  { to: CONSUMER_ROUTES.profile, label: 'Overview', end: true },
  { to: '/investment/roi', label: 'ROI analysis' },
  { to: '/investment/portfolio', label: 'Portfolio' },
  { to: '/investment/deals', label: 'Deal room' },
  { to: '/investment/forecast', label: 'Forecast' },
  { to: `${WORKSPACE_ENTRY_PATH}?next=market-intelligence`, label: 'Market data' },
]

export default function InvestmentShell(props) {
  return (
    <WorkspaceShell
      workspaceLabel="Investment center"
      homePath={CONSUMER_ROUTES.profile}
      links={INVESTMENT_LINKS}
      {...props}
    />
  )
}
