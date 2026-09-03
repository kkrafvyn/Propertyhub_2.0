import { supabase } from "./supabase";

export type PendingLeaseSignLink = {
  esignatureRequestId: string;
  leaseId: string;
  documentName: string;
  signingUrl: string;
  jurisdictionLabel?: string | null;
};

function buildSigningUrl(publicSignToken: string | null): string | null {
  if (!publicSignToken) return null;
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : import.meta.env.VITE_PUBLIC_APP_URL || "https://app.baytmiftah.com";
  return `${String(base).replace(/\/+$/, "")}/sign/${publicSignToken}`;
}

export const whatsappLeaseSignService = {
  buildSigningUrl,

  async getPendingForPhone(organizationId: string, phone: string): Promise<PendingLeaseSignLink | null> {
    const { data, error } = await supabase.rpc("get_pending_lease_sign_for_phone", {
      p_organization_id: organizationId,
      p_phone: phone,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.public_sign_token) return null;
    return {
      esignatureRequestId: row.esignature_request_id,
      leaseId: row.lease_id,
      documentName: row.document_name || "Lease agreement",
      signingUrl: buildSigningUrl(row.public_sign_token)!,
      jurisdictionLabel: row.jurisdiction_label,
    };
  },

  formatSignReply(link: PendingLeaseSignLink, recipientName = "there"): string {
    return [
      "📝 *LEASE SIGNATURE*",
      "━━━━━━━━━━━━━━━━━━━━━━",
      `Hello *${recipientName}*,`,
      `Your agreement *${link.documentName}* is ready.`,
      link.jurisdictionLabel ? `📍 ${link.jurisdictionLabel}` : "",
      "",
      "✍️ Sign securely:",
      link.signingUrl,
    ]
      .filter(Boolean)
      .join("\n");
  },
};
