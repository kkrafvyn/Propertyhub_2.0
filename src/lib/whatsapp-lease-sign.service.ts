import { supabase } from "./supabase";
import { buildPublicSigningUrl } from "./esignature-signer-token";

export type PendingLeaseSignLink = {
  esignatureRequestId: string;
  leaseId: string;
  documentName: string;
  signingUrl: string;
  jurisdictionLabel?: string | null;
};

export const whatsappLeaseSignService = {
  buildSigningUrl(publicSignToken: string | null, signerToken?: string | null): string | null {
    if (!publicSignToken) return null;
    return buildPublicSigningUrl(publicSignToken, signerToken);
  },

  /** Server-only (service_role). Browser clients cannot call the RPC after security hardening. */
  async getPendingForPhone(organizationId: string, phone: string): Promise<PendingLeaseSignLink | null> {
    const { data, error } = await supabase.rpc("get_pending_lease_sign_for_phone", {
      p_organization_id: organizationId,
      p_phone: phone,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.public_sign_token) return null;
    const signingUrl = buildPublicSigningUrl(row.public_sign_token, row.signer_token);
    if (!signingUrl) return null;
    return {
      esignatureRequestId: row.esignature_request_id,
      leaseId: row.lease_id,
      documentName: row.document_name || "Lease agreement",
      signingUrl,
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
