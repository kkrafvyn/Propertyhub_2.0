import WorkspaceShell from './WorkspaceShell'
import { useSmartShellNav } from '../i18n/useWorkspaceLinks'

export default function SmartShell(props) {
  const nav = useSmartShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
