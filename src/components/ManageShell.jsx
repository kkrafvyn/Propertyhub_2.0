import WorkspaceShell from './WorkspaceShell'
import { useManageShellNav } from '../i18n/useWorkspaceLinks'

export default function ManageShell(props) {
  const nav = useManageShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
