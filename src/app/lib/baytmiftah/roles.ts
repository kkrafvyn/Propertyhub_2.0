import type { User } from "@supabase/supabase-js";

export const USER_ROLES = {
  CONSUMER: "consumer",
  HOST: "host",
  AGENT: "agent",
  ADMIN: "admin",
  WALLET: "wallet",
} as const;

export const ROLE_HOME_PATHS: Record<string, string> = {
  consumer: "/",
  host: "/workspace",
  agent: "/workspace",
  admin: "/admin",
  wallet: "/app/wallet",
};

export function getMetadataRole(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const role = (metadata as { role?: unknown }).role;
  return typeof role === "string" ? role : undefined;
}

export function getUserRole(
  user?: User | { app_metadata?: unknown; user_metadata?: unknown } | null,
  profile?: { role?: string } | null
) {
  if (!user) return null;
  return (
    profile?.role ||
    getMetadataRole(user.app_metadata) ||
    getMetadataRole(user.user_metadata) ||
    USER_ROLES.CONSUMER
  );
}

export function getRoleHomePath(
  user?: User | { app_metadata?: unknown; user_metadata?: unknown } | null,
  profile?: { role?: string } | null
) {
  const role = getUserRole(user, profile);
  return (role && ROLE_HOME_PATHS[role]) || "/";
}

export function isFullAdminRole(role?: string | null) {
  return role === "admin" || role === "platform_admin";
}

export function isWorkspaceRole(role?: string | null) {
  return ["host", "agent", "manager", "owner"].includes(role || "");
}

export function isProfessionalRole(role?: string | null) {
  return ["host", "agent", "admin", "platform_admin", "agency"].includes(role || "");
}
