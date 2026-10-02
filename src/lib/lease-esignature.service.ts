import { supabase } from "./supabase";
import { eSignatureService, type EsigSigner } from "./esignature.service";
import { buildLeaseTemplate } from "./lease-template.service";
import { analyzeLeaseForProperty } from "./jurisdiction-lease-analyzer.service";
import { assertLeaseAuditPassing, leaseAuditGateLabel } from "./lease-audit-gate";
import { archiveLeaseDraftOnSend, finalizeLeaseDocumentOnSign } from "./lease-document-archive.service";
import {
  buildPropertyComplianceSnapshot,
  type PropertyLocationInput,
} from "./property-country-context.service";
import { jurisdictionCounselSignoffService } from "./jurisdiction-counsel-signoff.service";
import { revenueJurisdictionEventsService } from "./revenue-jurisdiction-events.service";
import { notificationService } from "./notification.service";
import { docuSignEnvelopeService } from "./docusign-envelope.service";
import { leaseCosignService } from "./lease-cosign.service";
import type { CountryCode } from "./country-rules";

export type LeaseForSigning = {
  id: string;
  organization_id: string;
  deal_case_id?: string | null;
  listing_id?: string | null;
  rent_minor: number;
  currency?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  tenant_user_id?: string | null;
  tenant?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  listing?: {
    id?: string;
    property?: PropertyLocationInput & {
      address?: string | null;
      ghana_post_gps?: string | null;
    } | null;
  } | null;
};

export type SendLeaseForSigningInput = {
  organizationId: string;
  lease: LeaseForSigning;
  requestedBy?: string;
  landlordName?: string;
  templateId?: string;
  expiresInDays?: number;
  customClauses?: string[];
  forceOverride?: boolean;
  landlordCosign?: boolean;
};

export type PreparedLeaseEnvelope = {
  documentName: string;
  documentBody: string;
  jurisdictionId: CountryCode;
  jurisdictionLabel: string;
  subdivisionCode?: string;
  subdivisionLabel?: string;
  auditScore: number;
  auditGate: ReturnType<typeof leaseAuditGateLabel>;
  warnings: string[];
  addendumTitle?: string;
};

/** Generate lease document body with jurisdiction clauses (no DB write). */
export function prepareLeaseEnvelope(input: SendLeaseForSigningInput): PreparedLeaseEnvelope {
  const property = input.lease.listing?.property || {};
  const snapshot = buildPropertyComplianceSnapshot(property);
  const rentMajor = input.lease.rent_minor / 100;
  const schedule = buildLeaseTemplate({
    property,
    templateId: input.templateId,
    landlordName: input.landlordName,
    tenantName: input.lease.tenant?.full_name || undefined,
    rentAmountMajor: rentMajor,
    currency: input.lease.currency || undefined,
    startDate: input.lease.start_date || undefined,
  });

  const extraClauses = (input.customClauses || []).filter(Boolean);
  const markdown =
    extraClauses.length > 0
      ? `${schedule.markdown}\n\n## Additional terms\n${extraClauses.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
      : schedule.markdown;

  const audit = analyzeLeaseForProperty(markdown, property);
  const address = property.address || "Lease property";
  const tenant = input.lease.tenant?.full_name || "Tenant";

  return {
    documentName: `Lease — ${address} — ${tenant}`,
    documentBody: markdown,
    jurisdictionId: snapshot.jurisdictionId,
    jurisdictionLabel: schedule.jurisdictionLabel,
    subdivisionCode: snapshot.subdivisionCode,
    subdivisionLabel: schedule.subdivisionLabel,
    auditScore: audit.overallScore,
    auditGate: leaseAuditGateLabel(audit.overallScore),
    warnings: schedule.warnings,
    addendumTitle: schedule.addendumTitle,
  };
}

/** Create and send e-signature envelope with auto-generated jurisdiction clauses. */
export async function sendLeaseForSigning(input: SendLeaseForSigningInput) {
  const tenantEmail = input.lease.tenant?.email?.trim();
  const tenantName = input.lease.tenant?.full_name?.trim();
  if (!tenantEmail || !tenantName) {
    throw new Error("Lease must have an assigned tenant with name and email.");
  }

  const prepared = prepareLeaseEnvelope(input);
  assertLeaseAuditPassing(prepared.auditScore, {
    forceOverride: input.forceOverride,
    violations: prepared.warnings,
  });

  const hasCounsel = await jurisdictionCounselSignoffService.hasSignoff(
    input.organizationId,
    prepared.jurisdictionId,
    prepared.subdivisionCode
  );
  jurisdictionCounselSignoffService.assertSignoff(
    input.organizationId,
    prepared.jurisdictionId,
    prepared.subdivisionCode,
    hasCounsel,
    { forceOverride: input.forceOverride }
  );

  const metadata: Record<string, unknown> = {
    jurisdictionId: prepared.jurisdictionId,
    jurisdictionLabel: prepared.jurisdictionLabel,
    subdivisionLabel: prepared.subdivisionLabel,
    auditScore: prepared.auditScore,
    auditOverride: Boolean(input.forceOverride),
    counselOverride: Boolean(input.forceOverride && !hasCounsel),
    templateId: input.templateId || "residential_standard",
    addendumTitle: prepared.addendumTitle,
    source: "lease_clause_generator",
  };

  if (docuSignEnvelopeService.isDocuSignConfigured()) {
    metadata.docusignEnvelope = docuSignEnvelopeService.buildDocuSignEnvelope({
      documentName: prepared.documentName,
      documentBody: prepared.documentBody,
      signerName: tenantName,
      signerEmail: tenantEmail,
      metadata,
    });
  }

  const landlordSigner =
    input.landlordCosign !== false
      ? await leaseCosignService.resolveLandlordSigner(input.organizationId)
      : null;

  const signers: EsigSigner[] = [
    {
      name: tenantName,
      email: tenantEmail,
      phone: input.lease.tenant?.phone || undefined,
      role: "tenant",
      routing_order: 1,
      status: "pending",
    },
  ];

  if (landlordSigner && landlordSigner.email !== tenantEmail.toLowerCase()) {
    signers.push({
      name: landlordSigner.name,
      email: landlordSigner.email,
      phone: landlordSigner.phone || undefined,
      role: "landlord",
      routing_order: 2,
      status: "pending",
    });
    metadata.cosignRequired = true;
    metadata.landlordSignerUserId = landlordSigner.userId;
  }

  const request = await eSignatureService.createRequest({
    organizationId: input.organizationId,
    documentType: "lease_agreement",
    documentName: prepared.documentName,
    documentBody: prepared.documentBody,
    signerName: tenantName,
    signerEmail: tenantEmail,
    signerPhone: input.lease.tenant?.phone || undefined,
    signers,
    relatedLeaseId: input.lease.id,
    requestedBy: input.requestedBy,
    expiresInDays: input.expiresInDays ?? 14,
    metadata,
  });

  if (input.requestedBy) {
    const listingId = input.lease.listing_id || input.lease.listing?.id;
    await archiveLeaseDraftOnSend({
      organizationId: input.organizationId,
      createdBy: input.requestedBy,
      lease: { ...input.lease, listing_id: listingId },
      prepared,
      esignatureRequestId: request.id,
    });
  }

  void revenueJurisdictionEventsService
    .record({
      organizationId: input.organizationId,
      jurisdictionId: prepared.jurisdictionId,
      subdivisionCode: prepared.subdivisionCode,
      eventType: "lease_esign_sent",
      amountMinor: input.lease.rent_minor,
      currency: input.lease.currency || "GHS",
      leaseId: input.lease.id,
      esignatureRequestId: request.id,
      metadata: { auditScore: prepared.auditScore, templateId: input.templateId },
    })
    .catch(() => undefined);

  void notificationService
    .notifyLeaseSignatureRequested({
      leaseId: input.lease.id,
      tenantUserId: input.lease.tenant_user_id,
      tenantEmail,
      tenantPhone: input.lease.tenant?.phone,
      documentName: prepared.documentName,
      signingUrl: eSignatureService.signingUrlForSigner(request, tenantEmail),
      jurisdictionLabel: prepared.subdivisionLabel || prepared.jurisdictionLabel,
      actorUserId: input.requestedBy,
      organizationId: input.organizationId,
    })
    .catch(() => undefined);

  if (docuSignEnvelopeService.isDocuSignConfigured() && metadata.docusignEnvelope) {
    void docuSignEnvelopeService
      .submitEnvelope({
        esignatureRequestId: request.id,
        envelope: metadata.docusignEnvelope as any,
      })
      .catch(() => undefined);
  }

  return request;
}

export async function getLeaseForSigning(leaseId: string): Promise<LeaseForSigning | null> {
  const { data, error } = await supabase
    .from("leases")
    .select(`
      id,
      organization_id,
      deal_case_id,
      listing_id,
      tenant_user_id,
      rent_minor,
      currency,
      start_date,
      end_date,
      tenant:users!leases_tenant_user_id_fkey(full_name, email, phone),
      listing:listings(
        id,
        property:properties(address, city, region, country, subdivision_code, ghana_post_gps)
      )
    `)
    .eq("id", leaseId)
    .maybeSingle();

  if (error) throw error;
  return data as LeaseForSigning | null;
}

export async function completeLeaseSigningFromToken(result: {
  esignature_request_id?: string;
  lease_id?: string | null;
  organization_document_id?: string | null;
  signer_name?: string;
  signer_email?: string;
  status?: string;
  signerUserId?: string | null;
  organizationId?: string;
  jurisdictionId?: string;
  subdivisionCode?: string | null;
  amountMinor?: number;
  currency?: string;
}) {
  if (result.status !== "completed") return null;

  let amountMinor = result.amountMinor;
  let currency = result.currency;
  if (result.lease_id && amountMinor == null) {
    const { data: leaseRow } = await supabase
      .from("leases")
      .select("rent_minor, currency, organization_id")
      .eq("id", result.lease_id)
      .maybeSingle();
    amountMinor = leaseRow?.rent_minor ?? 0;
    currency = leaseRow?.currency || currency || "GHS";
    if (!result.organizationId) {
      result.organizationId = leaseRow?.organization_id;
    }
  }

  const finalized = await finalizeLeaseDocumentOnSign({
    esignatureRequestId: result.esignature_request_id,
    organizationDocumentId: result.organization_document_id || undefined,
    leaseId: result.lease_id,
    signerName: result.signer_name || "Tenant",
    signerEmail: result.signer_email || "",
    signerUserId: result.signerUserId,
  });

  if (result.organizationId && result.jurisdictionId) {
    void revenueJurisdictionEventsService
      .record({
        organizationId: result.organizationId,
        jurisdictionId: result.jurisdictionId,
        subdivisionCode: result.subdivisionCode,
        eventType: "lease_esign_completed",
        amountMinor: amountMinor ?? 0,
        currency: currency || "GHS",
        leaseId: result.lease_id,
        esignatureRequestId: result.esignature_request_id,
      })
      .catch(() => undefined);
  }

  return finalized;
}

async function notifyLandlordCosignAfterTenantSign(result: {
  esignature_request_id?: string;
  lease_id?: string | null;
  signer_name?: string;
  signer_email?: string;
}) {
  if (!result.esignature_request_id) return;

  const { data: esigRow, error } = await supabase
    .from("esignature_requests")
    .select("document_name, signers, public_sign_token, metadata, organization_id, lease_id")
    .eq("id", result.esignature_request_id)
    .maybeSingle();
  if (error || !esigRow) return;

  const metadata = (esigRow.metadata || {}) as Record<string, unknown>;
  const landlordUserId = metadata.landlordSignerUserId as string | undefined;
  if (!landlordUserId || !esigRow.organization_id) return;

  const { data: landlord } = await supabase
    .from("users")
    .select("id, full_name, email, phone")
    .eq("id", landlordUserId)
    .maybeSingle();

  if (!landlord?.email) return;

  const signingUrl = eSignatureService.signingUrlForSigner(
    {
      public_sign_token: esigRow.public_sign_token,
      signers: Array.isArray(esigRow.signers) ? esigRow.signers : [],
    },
    landlord.email,
  );

  void notificationService
    .notifyLeaseCosignRequested({
      leaseId: esigRow.lease_id || result.esignature_request_id,
      landlordUserId: landlord.id,
      landlordEmail: landlord.email,
      landlordPhone: landlord.phone,
      documentName: esigRow.document_name || "Lease agreement",
      signingUrl: signingUrl || null,
      tenantName: result.signer_name || result.signer_email,
      organizationId: esigRow.organization_id,
    })
    .catch(() => undefined);
}

/** Route signing progress: server RPC finalizes on completion; notify landlord on partial cosign. */
export async function handleLeaseSigningProgress(result: {
  esignature_request_id?: string;
  lease_id?: string | null;
  organization_document_id?: string | null;
  signer_name?: string;
  signer_email?: string;
  status?: string;
  notify_cosign?: boolean;
}) {
  if (result.status === "completed") {
    return null;
  }

  if (result.status === "partially_signed" && result.notify_cosign) {
    await notifyLandlordCosignAfterTenantSign({
      esignature_request_id: result.esignature_request_id,
      lease_id: result.lease_id,
      signer_name: result.signer_name,
      signer_email: result.signer_email,
    });
  }

  return null;
}

export const leaseEsignatureService = {
  prepareLeaseEnvelope,
  sendLeaseForSigning,
  getLeaseForSigning,
  completeLeaseSigningFromToken,
  handleLeaseSigningProgress,
};
