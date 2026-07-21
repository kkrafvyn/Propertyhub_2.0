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

export function getUserRole(
  user?: { app_metadata?: { role?: string }; user_metadata?: { role?: string } } | null,
  profile?: { role?: string } | null
) {
  if (!user) return null;
  return (
    profile?.role ||
    user.app_metadata?.role ||
    user.user_metadata?.role ||
    USER_ROLES.CONSUMER
  );
}

export function getRoleHomePath(
  user?: { app_metadata?: { role?: string }; user_metadata?: { role?: string } } | null,
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
