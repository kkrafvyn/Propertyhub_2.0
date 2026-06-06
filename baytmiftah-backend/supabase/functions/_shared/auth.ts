import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ||
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";

export type AuthenticatedUser = {
  id: string;
  email?: string;
  role: string;
  agencyId?: string | null;
};

export function getSupabaseClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getUserSupabaseClient(authHeader?: string) {
  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function verifyToken(authHeader?: string): Promise<AuthenticatedUser> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = getUserSupabaseClient(authHeader);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("Invalid token");
  }

  const user = data.user;
  const appMetadata = user.app_metadata || {};
  const userMetadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email,
    role: appMetadata.role || userMetadata.role || "buyer",
    agencyId: appMetadata.agency_id || userMetadata.agency_id ||
      userMetadata.agencyId || null,
  };
}
