import { supabase } from "./supabase";

async function sha256Hex(content: string) {
  const bytes = new TextEncoder().encode(content);
  const hash = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function buildDefaultTemplate(input: {
  title: string;
  organizationName?: string | null;
  leadName?: string | null;
  propertyAddress?: string | null;
  amountFormatted?: string | null;
  documentType: string;
}) {
  const heading =
    input.documentType === "offer_letter"
      ? "Offer Letter"
      : input.documentType === "lease_contract"
        ? "Lease Agreement"
        : input.documentType === "sale_contract"
          ? "Sale Agreement"
          : "Agreement";

  return [
    `# ${input.title || heading}`,
    "",
    `Prepared by: ${input.organizationName || "Property Hub Workspace"}`,
    `Counterparty: ${input.leadName || "Client"}`,
    `Property: ${input.propertyAddress || "To be confirmed"}`,
    input.amountFormatted ? `Commercial value: ${input.amountFormatted}` : null,
    "",
    "## Terms",
    "",
    "1. The parties agree to proceed based on the listing and commercial terms captured in Property Hub.",
    "2. Any amendments should be recorded as a new version so the audit trail stays intact.",
    "3. Typed signatures captured through the workspace are treated as workflow approvals for this MVP.",
    "",
    "## Notes",
    "",
    "Add payment milestones, obligations, and contingencies here.",
  ]
    .filter(Boolean)
    .join("\n");
}

export const documentCenterService = {
  buildDefaultTemplate,

  async getOrganizationDocuments(organizationId: string) {
    const { data, error } = await supabase
      .from("organization_documents")
      .select(
        `
        *,
        signatures:document_signatures(*),
        activity_logs:document_activity_logs(*),
        deal_case:deal_cases(
          id,
          case_type,
          status,
          pipeline_stage,
          user:users(full_name, email),
          listing:listings(
            id,
            price,
            currency,
            property:properties(address, city, region)
          )
        ),
        transaction:property_transactions(
          id,
          amount_minor,
          currency,
          purpose,
          status
        )
      `
      )
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createDocument(input: {
    organizationId: string;
    createdBy: string;
    title: string;
    documentType: string;
    dealCaseId?: string | null;
    listingId?: string | null;
    transactionId?: string | null;
    contentMarkdown: string;
    publicVisibility?: boolean;
    signatureRequired?: boolean;
    externalSignerName?: string | null;
    externalSignerEmail?: string | null;
    publicSummary?: string | null;
  }) {
    const documentSha = await sha256Hex(input.contentMarkdown || "");

    const { data, error } = await supabase
      .from("organization_documents")
      .insert({
        organization_id: input.organizationId,
        created_by: input.createdBy,
        title: input.title,
        document_type: input.documentType,
        deal_case_id: input.dealCaseId || null,
        listing_id: input.listingId || null,
        transaction_id: input.transactionId || null,
        content_markdown: input.contentMarkdown,
        public_visibility: input.publicVisibility ?? false,
        signature_required: input.signatureRequired ?? true,
        external_signer_name: input.externalSignerName || null,
        external_signer_email: input.externalSignerEmail || null,
        public_summary: input.publicSummary || null,
        document_sha256: documentSha,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("document_activity_logs").insert({
      document_id: data.id,
      actor_user_id: input.createdBy,
      action: "document_created",
      details: {
        documentType: input.documentType,
        publicVisibility: input.publicVisibility ?? false,
      },
    });

    return data;
  },

  async createNewVersion(
    sourceDocument: any,
    input: {
      createdBy: string;
      contentMarkdown: string;
      title?: string;
      publicSummary?: string | null;
    }
  ) {
    const nextVersion = Number(sourceDocument.version_number || 1) + 1;
    const documentSha = await sha256Hex(input.contentMarkdown || "");

    await supabase
      .from("organization_documents")
      .update({ current_version: false })
      .eq("document_family_id", sourceDocument.document_family_id);

    const { data, error } = await supabase
      .from("organization_documents")
      .insert({
        document_family_id: sourceDocument.document_family_id,
        previous_version_id: sourceDocument.id,
        organization_id: sourceDocument.organization_id,
        deal_case_id: sourceDocument.deal_case_id,
        listing_id: sourceDocument.listing_id,
        transaction_id: sourceDocument.transaction_id,
        created_by: input.createdBy,
        version_number: nextVersion,
        title: input.title || sourceDocument.title,
        document_type: sourceDocument.document_type,
        status: "draft",
        signature_required: sourceDocument.signature_required,
        current_version: true,
        public_visibility: sourceDocument.public_visibility,
        content_markdown: input.contentMarkdown,
        public_summary: input.publicSummary ?? sourceDocument.public_summary,
        external_signer_name: sourceDocument.external_signer_name,
        external_signer_email: sourceDocument.external_signer_email,
        document_sha256: documentSha,
      })
      .select("*")
      .single();

    if (error) throw error;

    await supabase.from("document_activity_logs").insert({
      document_id: data.id,
      actor_user_id: input.createdBy,
      action: "document_version_created",
      details: {
        previousVersionId: sourceDocument.id,
        versionNumber: nextVersion,
      },
    });

    return data;
  },

  async signDocument(input: {
    documentId: string;
    signerUserId?: string | null;
    signerName: string;
    signerEmail?: string | null;
    signerRole?: string;
    signatureType?: string;
    signatureValue?: string | null;
  }) {
    const signatureType = input.signatureType || "typed";
    const signerRole = input.signerRole || "client";

    const { data: signature, error: signatureError } = await supabase
      .from("document_signatures")
      .insert({
        document_id: input.documentId,
        signer_user_id: input.signerUserId || null,
        signer_name: input.signerName,
        signer_email: input.signerEmail || null,
        signer_role: signerRole,
        signature_type: signatureType,
        signature_value: input.signatureValue || input.signerName,
      })
      .select("*")
      .single();

    if (signatureError) throw signatureError;

    const { data: updatedDocument, error: documentError } = await supabase
      .from("organization_documents")
      .update({
        status: "signed",
        signed_at: signature.signed_at,
        signed_by_user_id: input.signerUserId || null,
        signed_by_name: input.signerName,
        signature_method: signatureType,
      })
      .eq("id", input.documentId)
      .select("*")
      .single();

    if (documentError) throw documentError;

    await supabase.from("document_activity_logs").insert({
      document_id: input.documentId,
      actor_user_id: input.signerUserId || null,
      action: "document_signed",
      details: {
        signerName: input.signerName,
        signerRole,
        signatureType,
      },
    });

    return updatedDocument;
  },

  async updateDocumentVisibility(documentId: string, publicVisibility: boolean) {
    const { data, error } = await supabase
      .from("organization_documents")
      .update({ public_visibility: publicVisibility })
      .eq("id", documentId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
