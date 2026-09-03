import { supabase } from "./supabase";
import { notificationService } from "./notification.service";
import { sendLeaseSigningSms } from "./sms-gateway.service";
import { eSignatureService } from "./esignature.service";
import { whatsappNotifyService } from "./whatsapp-notify.service";

const db = supabase as any;

export type PendingEsignReminder = {
  id: string;
  organization_id: string;
  lease_id: string | null;
  document_name: string | null;
  signing_url: string | null;
  public_sign_token: string | null;
  expires_at: string | null;
  reminder_count: number;
  signers: Array<{ name?: string; email?: string; phone?: string }>;
};

export const leaseEsignReminderService = {
  async listPendingForOrg(organizationId: string): Promise<PendingEsignReminder[]> {
    const { data, error } = await db
      .from("esignature_requests")
      .select("id, organization_id, lease_id, document_name, signing_url, public_sign_token, expires_at, reminder_count, signers")
      .eq("organization_id", organizationId)
      .in("status", ["sent", "viewed", "partially_signed"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async sendReminder(requestId: string, actorUserId?: string): Promise<PendingEsignReminder> {
    const { data: row, error: fetchError } = await db
      .from("esignature_requests")
      .select(`
        id,
        organization_id,
        lease_id,
        document_name,
        signing_url,
        public_sign_token,
        expires_at,
        reminder_count,
        signers,
        lease:leases(tenant_user_id, tenant:users(full_name, email, phone))
      `)
      .eq("id", requestId)
      .single();
    if (fetchError) throw fetchError;

    const signer = Array.isArray(row.signers) ? row.signers[0] : null;
    const tenant = row.lease?.tenant;
    const tenantUserId = row.lease?.tenant_user_id;
    const signingUrl =
      row.signing_url || eSignatureService.getSigningUrl(row.public_sign_token);

    await notificationService.notifyLeaseSignatureRequested({
      leaseId: row.lease_id || row.id,
      tenantUserId,
      tenantEmail: signer?.email || tenant?.email || "",
      tenantPhone: signer?.phone || tenant?.phone,
      documentName: row.document_name || "Lease agreement",
      signingUrl,
      jurisdictionLabel: "Reminder",
      actorUserId,
      organizationId: row.organization_id,
    });

    const phone = signer?.phone || tenant?.phone;
    if (phone && signingUrl) {
      void whatsappNotifyService
        .sendLeaseSigningMessage({
          to: phone,
          recipientName: signer?.name || tenant?.full_name || "Tenant",
          documentName: row.document_name || "Lease agreement",
          signingUrl,
          jurisdictionLabel: "Reminder",
          organizationId: row.organization_id,
        })
        .catch(() => undefined);
    }

    const { data, error } = await db
      .from("esignature_requests")
      .update({
        reminder_count: (row.reminder_count || 0) + 1,
        last_reminder_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId)
      .select("id, organization_id, lease_id, document_name, signing_url, public_sign_token, expires_at, reminder_count, signers")
      .single();
    if (error) throw error;
    return data as PendingEsignReminder;
  },
};
