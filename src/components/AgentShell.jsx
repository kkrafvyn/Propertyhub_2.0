import WorkspaceShell from './WorkspaceShell'
import { useAgentShellNav } from '../i18n/useWorkspaceLinks'

export default function AgentShell(props) {
  const nav = useAgentShellNav()
  return <WorkspaceShell {...nav} {...props} />
}
