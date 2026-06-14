import WorkspaceShell from './WorkspaceShell'
import { useAdminShellNav } from '../i18n/useWorkspaceLinks'

export default function AdminShell(props) {
  const nav = useAdminShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
