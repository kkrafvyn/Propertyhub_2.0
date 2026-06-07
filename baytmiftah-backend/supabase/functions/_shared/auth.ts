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
  const service = getSupabaseClient();
  const { data: roleRecord } = await service
    .from("user_roles")
    .select("role, agency_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    role: roleRecord?.role || appMetadata.role || "buyer",
    agencyId: roleRecord?.agency_id || appMetadata.agency_id || null,
  };
}

export async function maybeVerifyToken(
  authHeader?: string,
): Promise<AuthenticatedUser | null> {
  try {
    return await verifyToken(authHeader);
  } catch {
    return null;
  }
}

export function isAdmin(user: AuthenticatedUser | null) {
  return user?.role === "admin";
}

export function requireAdmin(user: AuthenticatedUser | null) {
  if (!isAdmin(user)) {
    throw new Error("Admin access required");
  }
}

export async function getOrganizationAccess(
  supabase: ReturnType<typeof getSupabaseClient>,
  user: AuthenticatedUser | null,
  organizationId?: string | null,
) {
  if (!user || !organizationId) return { allowed: false, role: null, owner: false };
  if (isAdmin(user)) return { allowed: true, role: "admin", owner: false };

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id,owner_id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError) throw organizationError;
  if (organization?.owner_id === user.id) {
    return { allowed: true, role: "owner", owner: true };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError && !["PGRST205", "42P01"].includes(membershipError.code)) {
    throw membershipError;
  }

  const active = membership?.status ? membership.status === "active" : Boolean(membership);
  return {
    allowed: active,
    role: active ? membership?.role || "member" : null,
    owner: false,
  };
}

export async function requireOrganizationAccess(
  supabase: ReturnType<typeof getSupabaseClient>,
  user: AuthenticatedUser | null,
  organizationId?: string | null,
) {
  const access = await getOrganizationAccess(supabase, user, organizationId);
  if (!access.allowed) {
    throw new Error("Organization access required");
  }
  return access;
}

export async function requireOrganizationManager(
  supabase: ReturnType<typeof getSupabaseClient>,
  user: AuthenticatedUser | null,
  organizationId?: string | null,
) {
  const access = await requireOrganizationAccess(supabase, user, organizationId);
  if (!["admin", "owner"].includes(access.role || "")) {
    throw new Error("Organization manager access required");
  }
  return access;
}
