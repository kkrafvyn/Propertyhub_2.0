import WorkspaceShell from './WorkspaceShell'
import { useFinanceShellNav } from '../i18n/useWorkspaceLinks'

export default function FinanceShell(props) {
  const nav = useFinanceShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
