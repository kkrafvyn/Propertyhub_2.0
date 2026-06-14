import WorkspaceShell from './WorkspaceShell'
import { useIntelligenceShellNav } from '../i18n/useWorkspaceLinks'

export default function IntelligenceShell(props) {
  const nav = useIntelligenceShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
