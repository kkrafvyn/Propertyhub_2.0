import { supabase } from "./supabase";
import type { PlatformAccessFlags } from "./platform-access";
import type { PlatformConsoleGrant } from "./platform-console-grants";

export type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  verified: boolean | null;
  banned: boolean | null;
  is_platform_admin: boolean;
  is_platform_manager: boolean;
  platform_console_grants: string[];
  created_at: string | null;
};

export const adminService = {
  async getPlatformAccess(userId: string): Promise<PlatformAccessFlags> {
    const { data, error } = await supabase
      .from("users")
      .select("is_platform_admin, is_platform_manager, platform_console_grants")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return (
      data || {
        is_platform_admin: false,
        is_platform_manager: false,
        platform_console_grants: [],
      }
    );
  },

  async isPlatformAdmin(userId: string) {
    const access = await this.getPlatformAccess(userId);
    return Boolean(access.is_platform_admin);
  },

  async hasConsoleAccess(userId: string) {
    const access = await this.getPlatformAccess(userId);
    return Boolean(access.is_platform_admin || access.is_platform_manager);
  },

  async listUsers(limit = 50): Promise<AdminUserRow[]> {
    const { data, error } = await supabase
      .from("users")
      .select(
        "id, email, full_name, phone, verified, banned, is_platform_admin, is_platform_manager, platform_console_grants, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as AdminUserRow[];
  },

  async updateUser(
    userId: string,
    updates: {
      verified?: boolean;
      banned?: boolean;
      is_platform_admin?: boolean;
      is_platform_manager?: boolean;
      platform_console_grants?: string[];
    },
  ) {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select(
        "id, email, full_name, verified, banned, is_platform_admin, is_platform_manager, platform_console_grants",
      )
      .single();

    if (error) throw error;
    return data;
  },

  async setPlatformAdmin(userId: string, enabled: boolean) {
    return this.updateUser(userId, {
      is_platform_admin: enabled,
      ...(enabled
        ? { is_platform_manager: false, platform_console_grants: [] }
        : {}),
    });
  },

  async setPlatformGrants(userId: string, grants: PlatformConsoleGrant[]) {
    return this.updateUser(userId, {
      is_platform_admin: false,
      platform_console_grants: grants,
    });
  },

  async setPlatformAccess(
    userId: string,
    input: { isPlatformAdmin: boolean; grants: PlatformConsoleGrant[] },
  ) {
    if (input.isPlatformAdmin) {
      return this.setPlatformAdmin(userId, true);
    }

    if (input.grants.length === 0) {
      return this.updateUser(userId, {
        is_platform_admin: false,
        is_platform_manager: false,
        platform_console_grants: [],
      });
    }

    return this.setPlatformGrants(userId, input.grants);
  },

  async setPlatformManager(userId: string, enabled: boolean) {
    return this.updateUser(userId, {
      is_platform_manager: enabled,
      ...(enabled ? { is_platform_admin: false } : { platform_console_grants: [] }),
    });
  },

  async listOrganizations(limit = 50) {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, owner_id, verified, suspended, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async updateOrganization(
    organizationId: string,
    updates: {
      verified?: boolean;
      suspended?: boolean;
    },
  ) {
    const { data, error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", organizationId)
      .select("id, name, slug, verified, suspended")
      .single();

    if (error) throw error;
    return data;
  },

  async listListings(limit = 50) {
    const { data, error } = await supabase
      .from("listings")
      .select(`
        id,
        status,
        visibility,
        featured,
        price,
        currency,
        created_at,
        organization:organizations(id, name, slug),
        property:properties(address, city, region, category)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async updateListing(
    listingId: string,
    updates: {
      status?: string;
      visibility?: string;
      featured?: boolean;
    },
  ) {
    const { data, error } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", listingId)
      .select("id, status, visibility, featured")
      .single();

    if (error) throw error;
    return data;
  },
};
