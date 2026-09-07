import { supabase } from "./supabase";
import type { PlatformAccessFlags } from "./platform-access";
import { hasPlatformConsoleAccess } from "./platform-access";
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

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  verified: boolean | null;
  suspended: boolean | null;
  company_setup_completed?: boolean | null;
  business_types?: string[] | null;
  enabled_capabilities?: string[] | null;
  created_at: string | null;
};

export type AdminOrganizationProfile = {
  organization: AdminOrganizationRow;
  members: Array<{
    user_id: string;
    role: string | null;
    scope_mode?: string | null;
    joined_at?: string | null;
    user?: { id: string; email: string | null; full_name: string | null } | null;
  }>;
  recentProperties: Array<{
    id: string;
    address: string;
    city: string;
    region: string;
    created_at: string | null;
  }>;
  recentListings: Array<{
    id: string;
    status: string | null;
    price: number | null;
    currency: string | null;
    created_at: string | null;
    property?: { address?: string } | null;
  }>;
  stats: {
    memberCount: number;
    propertyCount: number;
    listingCount: number;
    openTaskCount: number;
  };
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
    return hasPlatformConsoleAccess(access);
  },

  async listUsers(limit = 200): Promise<AdminUserRow[]> {
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
      .select(
        "id, name, slug, owner_id, verified, suspended, created_at, business_types, enabled_capabilities, company_setup_completed",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async listOrganizationsWithStats(limit = 100) {
    const organizations = await this.listOrganizations(limit);
    if (!organizations.length) return [];

    const orgIds = organizations.map((org) => org.id);
    const { data: members, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .in("organization_id", orgIds);

    if (memberError) throw memberError;

    const memberCounts = (members || []).reduce<Record<string, number>>((acc, row) => {
      acc[row.organization_id] = (acc[row.organization_id] || 0) + 1;
      return acc;
    }, {});

    return organizations.map((organization) => ({
      ...organization,
      member_count: memberCounts[organization.id] || 0,
    }));
  },

  async getOrganizationProfile(organizationId: string): Promise<AdminOrganizationProfile> {
    const [
      organizationResult,
      membersResult,
      propertiesResult,
      listingsResult,
      propertyCountResult,
      listingCountResult,
      tasksResult,
    ] = await Promise.all([
      supabase.from("organizations").select("*").eq("id", organizationId).single(),
      supabase
        .from("organization_members")
        .select("user_id, role, scope_mode, joined_at, user:users(id, email, full_name)")
        .eq("organization_id", organizationId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("properties")
        .select("id, address, city, region, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("listings")
        .select("id, status, price, currency, created_at, property:properties(address)")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("workspace_tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["open", "in_progress"]),
    ]);

    if (organizationResult.error) throw organizationResult.error;
    if (membersResult.error) throw membersResult.error;
    if (propertiesResult.error) throw propertiesResult.error;
    if (listingsResult.error) throw listingsResult.error;

    const members = (membersResult.data || []).map((row) => {
      const user = Array.isArray(row.user) ? row.user[0] : row.user;
      return {
        user_id: row.user_id as string,
        role: row.role as string | null,
        scope_mode: row.scope_mode as string | null | undefined,
        joined_at: row.joined_at as string | null | undefined,
        user: user
          ? {
              id: user.id as string,
              email: user.email as string | null,
              full_name: user.full_name as string | null,
            }
          : null,
      };
    });

    const recentListings = (listingsResult.data || []).map((row) => {
      const property = Array.isArray(row.property) ? row.property[0] : row.property;
      return {
        id: row.id as string,
        status: row.status as string | null,
        price: row.price as number | null,
        currency: row.currency as string | null,
        created_at: row.created_at as string | null,
        property: property ? { address: property.address as string | undefined } : null,
      };
    });

    return {
      organization: organizationResult.data as AdminOrganizationRow,
      members,
      recentProperties: (propertiesResult.data || []) as AdminOrganizationProfile["recentProperties"],
      recentListings,
      stats: {
        memberCount: membersResult.data?.length || 0,
        propertyCount: propertyCountResult.count || 0,
        listingCount: listingCountResult.count || 0,
        openTaskCount: tasksResult.count || 0,
      },
    };
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
