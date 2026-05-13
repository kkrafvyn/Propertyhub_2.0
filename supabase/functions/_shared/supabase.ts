import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { HttpError } from "./http.ts";

function resolveKeyFromMap(envName: string) {
  const rawValue = Deno.env.get(envName);
  if (!rawValue) return undefined;

  try {
    const keyMap = JSON.parse(rawValue) as Record<string, string>;
    const defaultKeyName = keyMap.default;
    if (!defaultKeyName) return undefined;
    return Deno.env.get(defaultKeyName) || defaultKeyName;
  } catch {
    return rawValue;
  }
}

function getSupabaseConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey =
    resolveKeyFromMap("SUPABASE_PUBLISHABLE_KEYS") ||
    Deno.env.get("SUPABASE_ANON_KEY") ||
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey =
    resolveKeyFromMap("SUPABASE_SECRET_KEYS") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !publishableKey || !serviceRoleKey) {
    throw new HttpError(500, "Missing Supabase environment configuration");
  }

  return {
    url,
    publishableKey,
    serviceRoleKey,
  };
}

export function createUserClient(authHeader: string) {
  const { url, publishableKey } = getSupabaseConfig();

  return createClient(url, publishableKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseConfig();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) {
    throw new HttpError(401, "Missing authorization header");
  }

  const userClient = createUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "You must be signed in to perform this action");
  }

  return { user, userClient };
}
