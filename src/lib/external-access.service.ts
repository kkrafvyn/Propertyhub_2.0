import { supabase } from "./supabase";

export type ExternalResourceType = "maintenance_request" | "estate_work_order";

export type ExternalAccessGrant = {
  grant_id: string;
  access_token: string;
};

export type ValidatedExternalGrant = {
  grant_id: string;
  organization_id: string;
  resource_type: ExternalResourceType;
  resource_id: string;
  label: string | null;
};

export const externalAccessService = {
  async createGrant(input: {
    organizationId: string;
    resourceType: ExternalResourceType;
    resourceId: string;
    recipientEmail?: string;
    label?: string;
    expiresInHours?: number;
  }): Promise<ExternalAccessGrant> {
    const { data, error } = await supabase.rpc("create_external_access_grant", {
      p_organization_id: input.organizationId,
      p_resource_type: input.resourceType,
      p_resource_id: input.resourceId,
      p_recipient_email: input.recipientEmail ?? null,
      p_label: input.label ?? null,
      p_expires_in_hours: input.expiresInHours ?? 168,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    return {
      grant_id: row.grant_id as string,
      access_token: row.access_token as string,
    };
  },

  async validateToken(token: string): Promise<ValidatedExternalGrant | null> {
    const { data, error } = await supabase.rpc("validate_external_access_token", {
      p_token: token,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      grant_id: row.grant_id as string,
      organization_id: row.organization_id as string,
      resource_type: row.resource_type as ExternalResourceType,
      resource_id: row.resource_id as string,
      label: (row.label as string | null) ?? null,
    };
  },

  async getMaintenanceByToken(token: string) {
    const { data, error } = await supabase.rpc("get_external_maintenance_by_token", {
      p_token: token,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row ?? null;
  },

  async updateMaintenanceByToken(token: string, status: string, note?: string) {
    const { data, error } = await supabase.rpc("update_external_maintenance_status", {
      p_token: token,
      p_status: status,
      p_note: note ?? null,
    });
    if (error) throw error;
    return Boolean(data);
  },

  buildAccessUrl(token: string, origin = typeof window !== "undefined" ? window.location.origin : "") {
    return `${origin.replace(/\/+$/, "")}/contractor/access/${token}`;
  },
};
