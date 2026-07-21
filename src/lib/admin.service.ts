import { supabase } from "./supabase";

export const adminService = {
  async isPlatformAdmin(userId: string) {
    const { data, error } = await supabase
      .from("users")
      .select("is_platform_admin")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.is_platform_admin);
  },

  async listUsers(limit = 50) {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, phone, verified, banned, is_platform_admin, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async updateUser(
    userId: string,
    updates: {
      verified?: boolean;
      banned?: boolean;
      is_platform_admin?: boolean;
    }
  ) {
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("id, email, full_name, verified, banned, is_platform_admin")
      .single();

    if (error) throw error;
    return data;
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
    }
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
    }
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
