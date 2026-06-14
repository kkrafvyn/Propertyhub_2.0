import WorkspaceShell from './WorkspaceShell'
import { useDeveloperShellNav } from '../i18n/useWorkspaceLinks'

export default function DeveloperShell(props) {
  const nav = useDeveloperShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
