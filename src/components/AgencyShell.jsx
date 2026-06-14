import WorkspaceShell from './WorkspaceShell'
import { useAgencyShellNav } from '../i18n/useWorkspaceLinks'

export default function AgencyShell(props) {
  const nav = useAgencyShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
