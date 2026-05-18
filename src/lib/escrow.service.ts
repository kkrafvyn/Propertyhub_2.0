import { supabase } from "./supabase";
import { sha256Hex } from "./browser-crypto";

export type EscrowStatus =
  | "initiated"
  | "held"
  | "docs_pending"
  | "docs_approved"
  | "released"
  | "disputed"
  | "refunded"
  | "cancelled";

export type EscrowAction =
  | "upload_document"
  | "review_document"
  | "confirm_release"
  | "raise_dispute"
  | "resolve_dispute"
  | "cancel_within_window";

const db = supabase as any;
const CONDITION_REPORT_MEDIA_BUCKET =
  import.meta.env.VITE_CONDITION_REPORT_MEDIA_BUCKET || "condition-report-media";

const ESCROW_SELECT = `
  *,
  transaction:property_transactions(*),
  listing:listings(
    id,
    listing_type,
    price,
    currency,
    property:properties(address, city, region)
  ),
  organization:organizations(name, slug, paystack_transfer_recipient_code, stripe_connect_account_id),
  payer:users(id, full_name, email, phone),
  documents:property_escrow_documents(*),
  events:property_escrow_events(*),
  condition_reports:property_condition_reports(*)
`;

export const escrowService = {
  async getOrganizationEscrows(organizationId: string) {
    const { data, error } = await db
      .from("property_escrows")
      .select(ESCROW_SELECT)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getUserEscrows(userId: string) {
    const { data, error } = await db
      .from("property_escrows")
      .select(ESCROW_SELECT)
      .eq("payer_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async managePropertyEscrow<T = any>(body: {
    action: EscrowAction;
    escrowId: string;
    documentType?: string;
    title?: string;
    contentMarkdown?: string;
    publicSummary?: string | null;
    escrowDocumentId?: string;
    approved?: boolean;
    reason?: string;
    resolution?: "release_to_organization" | "refund_to_payer";
    note?: string;
  }) {
    const { data, error } = await supabase.functions.invoke("manage-property-escrow", {
      body,
    });

    if (error) throw error;
    return data as T;
  },

  async submitConditionReport(input: {
    escrowId?: string | null;
    listingId: string;
    propertyId: string;
    organizationId: string;
    dealCaseId?: string | null;
    submittedBy: string;
    submittedRole: "agent" | "tenant" | "owner" | "manager" | "admin";
    reportStage?: "move_in" | "move_out" | "ad_hoc";
    notes: string;
    photoUrls?: string[];
    photoFiles?: File[];
    metadata?: Record<string, unknown>;
  }) {
    const photoStoragePaths =
      input.photoFiles && input.photoFiles.length > 0
        ? await uploadConditionReportPhotos({
            organizationId: input.organizationId,
            escrowId: input.escrowId || "no-escrow",
            submittedBy: input.submittedBy,
            files: input.photoFiles,
          })
        : [];

    const reportHash = await sha256Hex(
      JSON.stringify({
        escrowId: input.escrowId || null,
        listingId: input.listingId,
        propertyId: input.propertyId,
        notes: input.notes,
        photoUrls: input.photoUrls || [],
        photoStoragePaths,
        reportStage: input.reportStage || "move_in",
      })
    );

    const { data, error } = await db
      .from("property_condition_reports")
      .insert({
        escrow_id: input.escrowId || null,
        listing_id: input.listingId,
        property_id: input.propertyId,
        organization_id: input.organizationId,
        deal_case_id: input.dealCaseId || null,
        submitted_by: input.submittedBy,
        submitted_role: input.submittedRole,
        report_stage: input.reportStage || "move_in",
        notes: input.notes,
        photo_urls: input.photoUrls || [],
        photo_storage_paths: photoStoragePaths,
        photo_captured_at: photoStoragePaths.length > 0 ? new Date().toISOString() : null,
        report_sha256: reportHash,
        metadata: {
          ...(input.metadata || {}),
          photoCount: photoStoragePaths.length,
        },
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async getConditionReportPhotoUrl(path: string, expiresInSeconds = 60 * 10) {
    const { data, error } = await supabase.storage
      .from(CONDITION_REPORT_MEDIA_BUCKET)
      .createSignedUrl(path, expiresInSeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  async acknowledgeConditionReport(reportId: string, userId: string) {
    const { data, error } = await db
      .from("property_condition_reports")
      .update({
        condition_status: "acknowledged",
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", reportId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};

function conditionReportPhotoPath(input: {
  organizationId: string;
  escrowId: string;
  submittedBy: string;
  file: File;
}) {
  const extension = input.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExtension = extension || "jpg";
  const fileId = crypto.randomUUID().replace(/-/g, "");
  return `${input.organizationId}/${input.escrowId}/${input.submittedBy}/${fileId}.${safeExtension}`;
}

async function uploadConditionReportPhotos(input: {
  organizationId: string;
  escrowId: string;
  submittedBy: string;
  files: File[];
}) {
  const paths: string[] = [];

  for (const file of input.files) {
    const path = conditionReportPhotoPath({ ...input, file });
    const { error } = await supabase.storage
      .from(CONDITION_REPORT_MEDIA_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (error) throw error;
    paths.push(path);
  }

  return paths;
}

export function getEscrowStatusLabel(status?: string | null) {
  if (!status) return "No escrow";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
