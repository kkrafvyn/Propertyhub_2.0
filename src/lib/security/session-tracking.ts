import { supabase } from "../supabase";

export async function trackUserSession(userId: string) {
  const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  const label =
    /mobile/i.test(userAgent) ? "Mobile browser" : /chrome/i.test(userAgent) ? "Chrome" : "Browser";

  const { data: existing } = await supabase
    .from("user_sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("user_agent", userAgent)
    .is("revoked_at", null)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("user_sessions")
      .update({ last_seen_at: new Date().toISOString(), session_label: label })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("user_sessions").insert({
    user_id: userId,
    session_label: label,
    user_agent: userAgent,
    last_seen_at: new Date().toISOString(),
  });
}

export async function revokeOtherSessions(userId: string, keepSessionId?: string) {
  let query = supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (keepSessionId) {
    query = query.neq("id", keepSessionId);
  }

  await query;
}
