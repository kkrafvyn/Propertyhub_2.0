import WorkspaceShell from './WorkspaceShell'
import { useRenterShellNav } from '../i18n/useWorkspaceLinks'

export default function RenterShell(props) {
  const nav = useRenterShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
