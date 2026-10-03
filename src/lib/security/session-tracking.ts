import { supabase } from "../supabase";
import { extractAuthSessionId, getOrCreateSessionInstallId } from "./session-id";

export async function trackUserSession(userId: string) {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const label =
    /mobile/i.test(userAgent) ? "Mobile browser" : /chrome/i.test(userAgent) ? "Chrome" : "Browser";

  const { data: sessionData } = await supabase.auth.getSession();
  const authSessionId =
    extractAuthSessionId(sessionData.session?.access_token) ?? getOrCreateSessionInstallId();

  const { data: existing } = await supabase
    .from("user_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("auth_session_id", authSessionId)
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("user_sessions")
      .update({ last_seen_at: new Date().toISOString(), session_label: label, user_agent: userAgent })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted } = await supabase
    .from("user_sessions")
    .insert({
      user_id: userId,
      session_label: label,
      user_agent: userAgent,
      auth_session_id: authSessionId,
      last_seen_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  return inserted?.id ?? null;
}

/** Removes a row from the activity list only (does not invalidate Supabase auth). */
export async function removeSessionFromActivityList(userId: string, sessionRowId: string) {
  await supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", sessionRowId);
}

export async function revokeOtherSessions(userId: string, keepSessionRowId?: string) {
  let query = supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (keepSessionRowId) {
    query = query.neq("id", keepSessionRowId);
  }

  await query;
}
