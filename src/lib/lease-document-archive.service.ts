import { documentCenterService } from "./document-center.service";
import { leaseWorkflowService } from "./lease-workflow.service";
import { supabase } from "./supabase";
import type { PreparedLeaseEnvelope } from "./lease-esignature.service";
import type { LeaseForSigning } from "./lease-esignature.service";

const db = supabase as any;

/** Create draft lease_contract in Document Center when envelope is sent. */
export async function archiveLeaseDraftOnSend(input: {
  organizationId: string;
  createdBy: string;
  lease: LeaseForSigning & { deal_case_id?: string | null; listing_id?: string | null };
  prepared: PreparedLeaseEnvelope;
  esignatureRequestId: string;
}) {
  const doc = await documentCenterService.createDocument({
    organizationId: input.organizationId,
    createdBy: input.createdBy,
    title: input.prepared.documentName,
    documentType: "lease_contract",
    dealCaseId: input.lease.deal_case_id,
    listingId: input.lease.listing_id,
    contentMarkdown: input.prepared.documentBody,
    signatureRequired: true,
    externalSignerName: input.lease.tenant?.full_name,
    externalSignerEmail: input.lease.tenant?.email,
    publicSummary: `Jurisdiction: ${input.prepared.subdivisionLabel || input.prepared.jurisdictionLabel}`,
  });

  await db
    .from("esignature_requests")
    .update({
      document_id: doc.id,
      metadata: {
        organizationDocumentId: doc.id,
        jurisdictionLabel: input.prepared.jurisdictionLabel,
        subdivisionLabel: input.prepared.subdivisionLabel,
        auditScore: input.prepared.auditScore,
        archivedAt: new Date().toISOString(),
        source: "lease_clause_generator",
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.esignatureRequestId);

  return doc;
}

/** Finalize org document + lease when tenant completes e-signature. */
export async function finalizeLeaseDocumentOnSign(input: {
  esignatureRequestId?: string;
  organizationDocumentId?: string;
  leaseId?: string | null;
  signerName: string;
  signerEmail: string;
  signerUserId?: string | null;
}) {
  let documentId = input.organizationDocumentId;
  let leaseId = input.leaseId;

  if (input.esignatureRequestId) {
    const { data: row } = await db
      .from("esignature_requests")
      .select("id, lease_id, document_id, metadata")
      .eq("id", input.esignatureRequestId)
      .maybeSingle();

    if (row) {
      leaseId = leaseId || row.lease_id;
      documentId = documentId || row.document_id || row.metadata?.organizationDocumentId;
    }
  }

  if (documentId) {
    await documentCenterService.signDocument({
      documentId,
      signerUserId: input.signerUserId,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      signerRole: "tenant",
      signatureType: "electronic",
      signatureValue: input.signerName,
    });
  }

  if (leaseId) {
    await leaseWorkflowService.markLeaseSigned(leaseId);
  }

  return { documentId, leaseId };
}

export const leaseDocumentArchiveService = {
  archiveLeaseDraftOnSend,
  finalizeLeaseDocumentOnSign,
};
