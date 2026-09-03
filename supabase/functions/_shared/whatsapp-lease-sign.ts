type AdminClient = ReturnType<typeof import("./supabase.ts").createAdminClient>;

export type PendingLeaseSignRow = {
  esignature_request_id: string;
  lease_id: string;
  document_name: string | null;
  public_sign_token: string;
  jurisdiction_label: string | null;
};

export async function lookupPendingLeaseSignForPhone(
  admin: AdminClient,
  organizationId: string,
  phone: string
): Promise<{ signingUrl: string; documentName: string; jurisdictionLabel: string | null } | null> {
  const { data, error } = await admin.rpc("get_pending_lease_sign_for_phone", {
    p_organization_id: organizationId,
    p_phone: phone,
  });
  if (error) {
    console.error("lookupPendingLeaseSignForPhone:", error);
    return null;
  }

  const row = (Array.isArray(data) ? data[0] : data) as PendingLeaseSignRow | undefined;
  if (!row?.public_sign_token) return null;

  const appUrl = (Deno.env.get("PUBLIC_APP_URL") || "https://app.baytmiftah.com").replace(/\/+$/, "");
  return {
    signingUrl: `${appUrl}/sign/${row.public_sign_token}`,
    documentName: row.document_name || "Lease agreement",
    jurisdictionLabel: row.jurisdiction_label,
  };
}
