/** Resolve Supabase service_role from env or Management API (never log the key). */
export async function resolveServiceRoleKey(env) {
  const fromEnv = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fromEnv) return fromEnv;

  const token = env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef =
    env.SUPABASE_PROJECT_REF?.trim() ||
    (env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0] : "");
  if (!token || !projectRef) return "";

  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return "";

  const keys = await response.json();
  const service = Array.isArray(keys)
    ? keys.find((entry) => entry.name === "service_role")
    : keys?.service_role;
  return service?.api_key?.trim() || "";
}
