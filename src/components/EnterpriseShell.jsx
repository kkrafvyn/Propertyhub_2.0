import WorkspaceShell from './WorkspaceShell'
import { useEnterpriseShellNav } from '../i18n/useWorkspaceLinks'

export default function EnterpriseShell(props) {
  const nav = useEnterpriseShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
