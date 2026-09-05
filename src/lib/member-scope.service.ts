import { supabase } from "./supabase";
import type { MemberScopeMode } from "./member-scope";

import { organizationUnitsService } from "./organization-units.service";

export const memberScopeService = {
  async getMemberPropertyIds(organizationId: string, userId: string) {
    const { data, error } = await supabase
      .from("organization_member_property_scopes")
      .select("property_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (error) throw error;
    return (data || []).map((row) => row.property_id);
  },

  async getMemberScope(organizationId: string, userId: string) {
    const { data, error } = await supabase
      .from("organization_members")
      .select(
        "scope_mode, permissions, role, finance_approval_limit_minor, maintenance_approval_limit_minor",
      )
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    const scopeMode = (data?.scope_mode || "organization") as MemberScopeMode;
    const [propertyIds, unitIds, scopedPropertyIds] =
      scopeMode === "properties"
        ? await Promise.all([
            this.getMemberPropertyIds(organizationId, userId),
            organizationUnitsService.getMemberUnitIds(organizationId, userId),
            this.getScopedPropertyIds(organizationId, userId),
          ])
        : [[], [], []];

    return {
      scopeMode,
      propertyIds,
      unitIds,
      scopedPropertyIds,
      permissions: Array.isArray(data?.permissions) ? (data.permissions as string[]) : [],
      role: data?.role || null,
      financeApprovalLimitMinor: data?.finance_approval_limit_minor ?? null,
      maintenanceApprovalLimitMinor: data?.maintenance_approval_limit_minor ?? null,
    };
  },

  async getScopedPropertyIds(organizationId: string, userId: string) {
    const [directIds, unitIds] = await Promise.all([
      this.getMemberPropertyIds(organizationId, userId),
      organizationUnitsService.getMemberUnitIds(organizationId, userId),
    ]);

    const unitPropertyIds = unitIds.length
      ? await organizationUnitsService.getUnitPropertyIds(organizationId, unitIds)
      : [];

    return [...new Set([...directIds, ...unitPropertyIds])];
  },

  async updateMemberScope(
    organizationId: string,
    userId: string,
    scopeMode: MemberScopeMode,
    propertyIds: string[],
    unitIds: string[] = [],
  ) {
    const { error: memberError } = await supabase
      .from("organization_members")
      .update({ scope_mode: scopeMode })
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (memberError) throw memberError;

    const { error: deleteError } = await supabase
      .from("organization_member_property_scopes")
      .delete()
      .eq("organization_id", organizationId)
      .eq("user_id", userId);

    if (deleteError) throw deleteError;

    if (scopeMode === "properties" && propertyIds.length) {
      const { error: insertError } = await supabase
        .from("organization_member_property_scopes")
        .insert(
          propertyIds.map((propertyId) => ({
            organization_id: organizationId,
            user_id: userId,
            property_id: propertyId,
          })),
        );

      if (insertError) throw insertError;
    }

    if (scopeMode === "properties") {
      await organizationUnitsService.setMemberUnitScopes(organizationId, userId, unitIds);
    } else {
      await organizationUnitsService.setMemberUnitScopes(organizationId, userId, []);
    }
  },
};
