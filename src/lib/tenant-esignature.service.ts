import { supabase } from "./supabase";
import { eSignatureService } from "./esignature.service";

const db = supabase as any;

export type TenantPendingEsignature = {
  id: string;
  document_name: string | null;
  document_type: string | null;
  lease_id: string | null;
  public_sign_token: string | null;
  expires_at: string | null;
  property_address: string | null;
  jurisdiction_label: string | null;
};

export const tenantEsignatureService = {
  async listPending(userId: string): Promise<TenantPendingEsignature[]> {
    const { data, error } = await db.rpc("get_tenant_pending_esignatures", {
      p_user_id: userId,
    });
    if (error) throw error;
    return (data || []) as TenantPendingEsignature[];
  },

  signingUrl(token: string | null) {
    return eSignatureService.getSigningUrl(token);
  },

  pendingByLeaseId(rows: TenantPendingEsignature[]) {
    return rows.reduce<Record<string, TenantPendingEsignature>>((acc, row) => {
      if (row.lease_id) acc[row.lease_id] = row;
      return acc;
    }, {});
  },
};
