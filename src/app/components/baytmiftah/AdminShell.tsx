import { WorkspaceShell } from './WorkspaceShell'
import { useAdminShellNav } from '../../i18n/useWorkspaceLinks'
import { useAuth } from '../../context/AuthContext'

export default function AdminShell(props) {
  const { role } = useAuth()
  const nav = useAdminShellNav(role)
  return <WorkspaceShell {...nav} {...props} />
}
