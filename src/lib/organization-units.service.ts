import { supabase } from "./supabase";

export type OrganizationUnitType = "business_unit" | "region" | "portfolio" | "custom";

export type OrganizationUnit = {
  id: string;
  organization_id: string;
  parent_unit_id: string | null;
  unit_type: OrganizationUnitType;
  name: string;
  code: string | null;
  created_at: string;
  updated_at: string;
};

export const organizationUnitsService = {
  async listUnits(organizationId: string) {
    const { data, error } = await supabase
      .from("organization_units")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");

    if (error) throw error;
    return (data || []) as OrganizationUnit[];
  },

  async createUnit(input: {
    organizationId: string;
    name: string;
    unitType?: OrganizationUnitType;
    code?: string | null;
    parentUnitId?: string | null;
  }) {
    const { data, error } = await supabase
      .from("organization_units")
      .insert({
        organization_id: input.organizationId,
        name: input.name.trim(),
        unit_type: input.unitType || "region",
        code: input.code?.trim() || null,
        parent_unit_id: input.parentUnitId || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data as OrganizationUnit;
  },

  async assignPropertyToUnit(unitId: string, propertyId: string) {
    const { error } = await supabase.from("organization_unit_properties").upsert({
      organization_unit_id: unitId,
      property_id: propertyId,
    });

    if (error) throw error;

    await supabase
      .from("properties")
      .update({ organization_unit_id: unitId })
      .eq("id", propertyId);
  },

  async getUnitPropertyIds(organizationId: string, unitIds: string[]) {
    if (!unitIds.length) return [] as string[];

    const { data, error } = await supabase
      .from("organization_unit_properties")
      .select("property_id, organization_unit_id, organization_units!inner(organization_id)")
      .in("organization_unit_id", unitIds);

    if (error) throw error;

    return (data || [])
      .filter((row) => {
        const units = row.organization_units as { organization_id?: string } | { organization_id?: string }[];
        const unit = Array.isArray(units) ? units[0] : units;
        return unit?.organization_id === organizationId;
      })
      .map((row) => row.property_id as string);
  },

  async setMemberUnitScopes(organizationId: string, userId: string, unitIds: string[]) {
    const { error: deleteError } = await supabase
      .from("organization_member_unit_scopes")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    if (!unitIds.length) return;

    const { error: insertError } = await supabase.from("organization_member_unit_scopes").insert(
      unitIds.map((unitId) => ({
        organization_id: organizationId,
        user_id: userId,
        unit_id: unitId,
      })),
    );

    if (insertError) throw insertError;
  },

  async getMemberUnitIds(organizationId: string, userId: string) {
    const { data, error } = await supabase
      .from("organization_member_unit_scopes")
      .select("unit_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map((row) => row.unit_id as string);
  },
};
