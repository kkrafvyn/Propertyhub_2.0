import { HttpError } from './http.ts';
import type { createUserClient } from './supabase.ts';
export async function reserveAiAction(client: ReturnType<typeof createUserClient>, organization: string, agent: string, tool: string) {
  const { error } = await client.rpc('consume_ai_action', { p_organization:organization,p_agent:agent,p_tool:tool,p_request:crypto.randomUUID() });
  if(error) throw new HttpError(403,'AI is paused, its daily budget is exhausted, or organization access could not be verified.');
}
