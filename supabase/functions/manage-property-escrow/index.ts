import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import {
  appendIntegrityAuditEvent,
  sha256Hex,
} from "../_shared/cryptographic-audit.ts";
import { refundBuyer, releaseToAgency } from "../_shared/payment-service.ts";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

type EscrowAction =
  | "upload_document"
  | "review_document"
  | "confirm_release"
  | "raise_dispute"
  | "resolve_dispute"
  | "cancel_within_window";

const REQUIRED_DOCUMENT_TYPES = new Set([
  "ownership_deed",
  "tenancy_agreement",
  "landlord_id",
]);

function escrowReference(prefix: string) {
  return `bm-${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
}

async function getEscrow(admin: any, escrowId: string) {
  const { data, error } = await admin
    .from("property_escrows")
    .select(
      `
      *,
      transaction:property_transactions(*),
      organization:organizations(paystack_transfer_recipient_code, stripe_connect_account_id, escrow_release_account_label)
    `
    )
    .eq("id", escrowId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, "Escrow record not found");
  return data;
}

async function requireOrganizationActor(
  admin: any,
  userId: string,
  organizationId: string,
  roles: string[] = ["owner", "manager", "agent"]
) {
  const { data, error } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data || !roles.includes(data.role)) {
    throw new HttpError(403, "You are not allowed to manage this escrow");
  }

  return data;
}

async function requirePlatformAdmin(admin: any, userId: string) {
  const { data, error } = await admin
    .from("platform_admins")
    .select("role,status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data || !["admin", "support"].includes(data.role)) {
    throw new HttpError(403, "A platform admin is required for this escrow action");
  }
}

async function canAccessEscrow(admin: any, userId: string, escrow: any) {
  if (escrow.payer_user_id === userId) return true;

  const { data: membership } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", escrow.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) return true;

  const { data: platformAdmin } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return Boolean(platformAdmin);
}

async function appendEscrowEvent(input: {
  admin: any;
  escrow: any;
  actorUserId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const { data: previous } = await input.admin
    .from("property_escrow_events")
    .select("event_hash")
    .eq("escrow_id", input.escrow.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const eventPayload = {
    ...input.payload,
    generatedAt: new Date().toISOString(),
  };
  const eventHash = await sha256Hex(
    JSON.stringify({
      escrowId: input.escrow.id,
      organizationId: input.escrow.organization_id,
      eventType: input.eventType,
      eventPayload,
      previousEventHash: previous?.event_hash || null,
    })
  );

  const { data, error } = await input.admin
    .from("property_escrow_events")
    .insert({
      escrow_id: input.escrow.id,
      organization_id: input.escrow.organization_id,
      actor_user_id: input.actorUserId,
      event_type: input.eventType,
      event_payload: eventPayload,
      previous_event_hash: previous?.event_hash || null,
      event_hash: eventHash,
    })
    .select("*")
    .single();

  if (error) throw new HttpError(500, error.message);
  const integrity = await appendIntegrityAuditEvent({
    admin: input.admin,
    eventType: input.eventType,
    entityType: "property_escrow",
    entityId: input.escrow.id,
    organizationId: input.escrow.organization_id,
    actorId: input.actorUserId,
    payload: {
      ...eventPayload,
      escrowEventId: data.id,
      eventHash,
    },
  });

  return {
    ...data,
    integrityAuditLog: integrity,
  };
}

async function syncEscrowDocumentStatus(admin: any, escrow: any) {
  const { data: documents, error } = await admin
    .from("property_escrow_documents")
    .select("document_type,status")
    .eq("escrow_id", escrow.id);

  if (error) throw new HttpError(500, error.message);

  const requiredTypes = Array.isArray(escrow.required_document_types)
    ? escrow.required_document_types
    : Array.from(REQUIRED_DOCUMENT_TYPES);
  const allApproved = requiredTypes.every((type: string) =>
    (documents || []).some(
      (document: any) => document.document_type === type && document.status === "approved"
    )
  );
  const anyUploaded = (documents || []).length > 0;
  const nextStatus = allApproved ? "docs_approved" : anyUploaded ? "docs_pending" : escrow.status;

  if (nextStatus === escrow.status) return escrow;

  const { data: updatedEscrow, error: updateError } = await admin
    .from("property_escrows")
    .update({
      status: nextStatus,
      documents_submitted_at: anyUploaded ? escrow.documents_submitted_at || new Date().toISOString() : null,
      documents_approved_at: allApproved ? new Date().toISOString() : null,
    })
    .eq("id", escrow.id)
    .select("*")
    .single();

  if (updateError) throw new HttpError(500, updateError.message);
  return updatedEscrow;
}

async function uploadDocument(admin: any, userId: string, escrow: any, body: any) {
  await requireOrganizationActor(admin, userId, escrow.organization_id);

  if (!["held", "docs_pending", "docs_approved"].includes(escrow.status)) {
    throw new HttpError(400, "Documents can only be uploaded while escrow is held or under review");
  }

  const documentType =
    typeof body?.documentType === "string" ? body.documentType.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const contentMarkdown =
    typeof body?.contentMarkdown === "string" ? body.contentMarkdown.trim() : "";

  if (!REQUIRED_DOCUMENT_TYPES.has(documentType) && documentType !== "escrow_evidence") {
    throw new HttpError(400, "Unsupported escrow document type");
  }

  if (!title || !contentMarkdown) {
    throw new HttpError(400, "title and contentMarkdown are required");
  }

  const documentSha = await sha256Hex(contentMarkdown);
  const { data: organizationDocument, error: documentError } = await admin
    .from("organization_documents")
    .insert({
      organization_id: escrow.organization_id,
      deal_case_id: escrow.deal_case_id,
      listing_id: escrow.listing_id,
      transaction_id: escrow.transaction_id,
      created_by: userId,
      title,
      document_type: documentType,
      status: "sent",
      signature_required: documentType === "tenancy_agreement",
      public_visibility: false,
      content_markdown: contentMarkdown,
      public_summary: body?.publicSummary || null,
      document_sha256: documentSha,
    })
    .select("*")
    .single();

  if (documentError) throw new HttpError(500, documentError.message);

  const { data: escrowDocument, error: escrowDocumentError } = await admin
    .from("property_escrow_documents")
    .upsert(
      {
        escrow_id: escrow.id,
        organization_id: escrow.organization_id,
        organization_document_id: organizationDocument.id,
        uploaded_by: userId,
        document_type: documentType,
        title,
        document_sha256: documentSha,
        status: "uploaded",
        rejection_reason: null,
        reviewed_by: null,
        reviewed_at: null,
        metadata: {
          source: "manage_property_escrow",
          organizationDocumentId: organizationDocument.id,
        },
      },
      { onConflict: "escrow_id,document_type" }
    )
    .select("*")
    .single();

  if (escrowDocumentError) throw new HttpError(500, escrowDocumentError.message);

  const updatedEscrow = await syncEscrowDocumentStatus(admin, escrow);
  await appendEscrowEvent({
    admin,
    escrow: updatedEscrow,
    actorUserId: userId,
    eventType: "escrow_document_uploaded",
    payload: {
      documentType,
      organizationDocumentId: organizationDocument.id,
      escrowDocumentId: escrowDocument.id,
      documentSha,
    },
  });

  return {
    escrow: updatedEscrow,
    organizationDocument,
    escrowDocument,
  };
}

async function reviewDocument(admin: any, userId: string, escrow: any, body: any) {
  await requirePlatformAdmin(admin, userId);

  const escrowDocumentId =
    typeof body?.escrowDocumentId === "string" ? body.escrowDocumentId.trim() : "";
  const approved = Boolean(body?.approved);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!escrowDocumentId) {
    throw new HttpError(400, "escrowDocumentId is required");
  }

  if (!approved && !reason) {
    throw new HttpError(400, "A rejection reason is required");
  }

  const { data: reviewedEscrowDocument, error } = await admin
    .from("property_escrow_documents")
    .update({
      status: approved ? "approved" : "rejected",
      rejection_reason: approved ? null : reason,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", escrowDocumentId)
    .eq("escrow_id", escrow.id)
    .select("*")
    .single();

  if (error) throw new HttpError(500, error.message);
  let escrowDocument = reviewedEscrowDocument;

  if (approved) {
    const { data: organizationDocument } = escrowDocument.organization_document_id
      ? await admin
          .from("organization_documents")
          .select("content_markdown")
          .eq("id", escrowDocument.organization_document_id)
          .maybeSingle()
      : { data: null };
    const watermarkText = [
      "VERIFIED BY BAYTMIFTAH",
      `Escrow ID: ${escrow.id}`,
      `Document Type: ${escrowDocument.document_type}`,
      `Original SHA-256: ${escrowDocument.document_sha256}`,
      `Reviewed By: ${userId}`,
      `Reviewed At: ${new Date().toISOString()}`,
    ].join("\n");
    const watermarkedContent = `${watermarkText}\n\n---\n\n${
      organizationDocument?.content_markdown || ""
    }`;
    const watermarkedSha = await sha256Hex(watermarkedContent);

    const { data: watermarkedDocument, error: watermarkError } = await admin
      .from("property_escrow_documents")
      .update({
        watermark_text: watermarkText,
        watermarked_content_markdown: watermarkedContent,
        watermarked_sha256: watermarkedSha,
        watermarked_at: new Date().toISOString(),
      })
      .eq("id", escrowDocument.id)
      .select("*")
      .single();

    if (watermarkError) throw new HttpError(500, watermarkError.message);
    escrowDocument = watermarkedDocument;

    await admin.from("verification_hashes").upsert(
      {
        organization_id: escrow.organization_id,
        document_id: escrowDocument.organization_document_id || escrowDocument.id,
        document_type: "escrow_document",
        hash_algorithm: "SHA-256",
        hash_value: escrowDocument.document_sha256,
        verified: true,
        verification_timestamp: new Date().toISOString(),
        uploaded_by: escrowDocument.uploaded_by,
        metadata: {
          escrowId: escrow.id,
          escrowDocumentId: escrowDocument.id,
          documentType: escrowDocument.document_type,
          watermarkedSha,
          reviewedBy: userId,
        },
      },
      { onConflict: "organization_id,document_id,hash_value" }
    );
  }

  const updatedEscrow = await syncEscrowDocumentStatus(admin, escrow);
  const escrowEvent = await appendEscrowEvent({
    admin,
    escrow: updatedEscrow,
    actorUserId: userId,
    eventType: approved ? "escrow_document_approved" : "escrow_document_rejected",
    payload: {
      escrowDocumentId: escrowDocument.id,
      documentType: escrowDocument.document_type,
      watermarkedSha: approved ? escrowDocument.watermarked_sha256 || null : null,
      reason: approved ? null : reason,
    },
  });

  if (approved && escrowEvent.integrityAuditLog?.id) {
    const { data: signedDocument, error: signedDocumentError } = await admin
      .from("property_escrow_documents")
      .update({
        rsa_signature: escrowEvent.integrityAuditLog.rsa_signature || null,
        integrity_audit_log_id: escrowEvent.integrityAuditLog.id,
      })
      .eq("id", escrowDocument.id)
      .select("*")
      .single();

    if (signedDocumentError) throw new HttpError(500, signedDocumentError.message);
    escrowDocument = signedDocument;
  }

  return {
    escrow: updatedEscrow,
    escrowDocument,
  };
}

async function releaseEscrow(admin: any, userId: string, escrow: any, note?: string) {
  if (!["docs_approved", "disputed"].includes(escrow.status)) {
    throw new HttpError(400, "Escrow can only be released after documents are approved or a dispute is resolved");
  }

  const transferReference = escrowReference("escrow-release");
  const transfer = await releaseToAgency({
    escrow,
    reference: transferReference,
    reason: note || `BaytMiftah escrow release for ${escrow.id}`,
  });

  const { data: updatedEscrow, error } = await admin
    .from("property_escrows")
    .update({
      status: "released",
      renter_confirmed_at: escrow.payer_user_id === userId ? new Date().toISOString() : escrow.renter_confirmed_at,
      released_at: new Date().toISOString(),
      resolved_by: escrow.status === "disputed" ? userId : escrow.resolved_by,
      resolved_at: escrow.status === "disputed" ? new Date().toISOString() : escrow.resolved_at,
      resolution: escrow.status === "disputed" ? "release_to_organization" : escrow.resolution,
      resolution_note: note || escrow.resolution_note,
      paystack_transfer_reference:
        transfer.provider === "paystack" ? transfer.reference || transferReference : escrow.paystack_transfer_reference,
      paystack_transfer_code:
        transfer.provider === "paystack" ? transfer.transferCode || null : escrow.paystack_transfer_code,
      stripe_transfer_id:
        transfer.provider === "stripe" ? transfer.transferCode || transfer.reference : escrow.stripe_transfer_id,
      metadata: {
        ...(escrow.metadata || {}),
        escrowRelease: transfer.raw,
        paymentProcessor: transfer.provider,
      },
    })
    .eq("id", escrow.id)
    .select("*")
    .single();

  if (error) throw new HttpError(500, error.message);

  const proofHash = await sha256Hex(
    JSON.stringify({
      escrowId: escrow.id,
      paymentProcessor: transfer.provider,
      transferReference: transfer.reference || transferReference,
      amountMinor: escrow.release_amount_minor || escrow.amount_minor,
      currency: escrow.currency,
      releasedAt: updatedEscrow.released_at,
    })
  );

  await admin.from("verification_hashes").upsert(
    {
      organization_id: escrow.organization_id,
      document_id: escrow.id,
      document_type: "escrow_release",
      hash_algorithm: "SHA-256",
      hash_value: proofHash,
      verified: true,
      verification_timestamp: new Date().toISOString(),
      uploaded_by: userId,
      metadata: {
        paymentProcessor: transfer.provider,
        transferReference: transfer.reference || transferReference,
        transferCode: transfer.transferCode || null,
      },
    },
    { onConflict: "organization_id,document_id,hash_value" }
  );

  await appendEscrowEvent({
    admin,
    escrow: updatedEscrow,
    actorUserId: userId,
    eventType: "escrow_released",
    payload: {
      paymentProcessor: transfer.provider,
      transferReference: transfer.reference || transferReference,
      transferCode: transfer.transferCode || null,
      proofHash,
      note: note || null,
    },
  });

  if (escrow.deal_case_id) {
    await admin
      .from("deal_cases")
      .update({
        status: "closed",
        pipeline_stage: "won",
        last_stage_updated_at: new Date().toISOString(),
      })
      .eq("id", escrow.deal_case_id);
  }

  return { escrow: updatedEscrow, transfer };
}

async function refundEscrow(admin: any, userId: string, escrow: any, reason: string, finalStatus: "refunded" | "cancelled") {
  const refund = await refundBuyer({
    admin,
    escrow,
    requestedByUserId: userId,
    reason,
  });

  const { data: updatedEscrow, error } = await admin
    .from("property_escrows")
    .update({
      status: finalStatus,
      refunded_at: new Date().toISOString(),
      cancelled_at: finalStatus === "cancelled" ? new Date().toISOString() : escrow.cancelled_at,
      resolved_by: escrow.status === "disputed" ? userId : escrow.resolved_by,
      resolved_at: escrow.status === "disputed" ? new Date().toISOString() : escrow.resolved_at,
      resolution: escrow.status === "disputed" ? "refund_to_payer" : escrow.resolution,
      resolution_note: reason,
      paystack_refund_reference:
        refund.provider === "paystack" ? refund.refundReference || null : escrow.paystack_refund_reference,
      stripe_refund_id:
        refund.provider === "stripe" ? refund.refundId || refund.refundReference : escrow.stripe_refund_id,
      metadata: {
        ...(escrow.metadata || {}),
        escrowRefund: refund.raw,
        paymentProcessor: refund.provider,
      },
    })
    .eq("id", escrow.id)
    .select("*")
    .single();

  if (error) throw new HttpError(500, error.message);

  const proofHash = await sha256Hex(
    JSON.stringify({
      escrowId: escrow.id,
      paymentProcessor: refund.provider,
      refundReference: refund.refundReference || null,
      amountMinor: escrow.amount_minor,
      currency: escrow.currency,
      reason,
      status: finalStatus,
    })
  );

  await admin.from("verification_hashes").upsert(
    {
      organization_id: escrow.organization_id,
      document_id: escrow.id,
      document_type: finalStatus === "cancelled" ? "escrow_refund" : "escrow_dispute_resolution",
      hash_algorithm: "SHA-256",
      hash_value: proofHash,
      verified: true,
      verification_timestamp: new Date().toISOString(),
      uploaded_by: userId,
      metadata: {
        paymentProcessor: refund.provider,
        refundReference: refund.refundReference || null,
        finalStatus,
      },
    },
    { onConflict: "organization_id,document_id,hash_value" }
  );

  await appendEscrowEvent({
    admin,
    escrow: updatedEscrow,
    actorUserId: userId,
    eventType: finalStatus === "cancelled" ? "escrow_cancelled_refund_started" : "escrow_refund_started",
    payload: {
      paymentProcessor: refund.provider,
      refundReference: refund.refundReference || null,
      proofHash,
      reason,
    },
  });

  return { escrow: updatedEscrow, refund: refund.raw, refundRecord: refund.refundRecord };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    const body = await req.json().catch(() => null);
    const action = typeof body?.action === "string" ? (body.action.trim() as EscrowAction) : "";
    const escrowId = typeof body?.escrowId === "string" ? body.escrowId.trim() : "";

    if (!action || !escrowId) {
      throw new HttpError(400, "action and escrowId are required");
    }

    const admin = createAdminClient();
    await enforceRateLimit({
      admin,
      req,
      route: `manage-property-escrow:${action}`,
      userId: user.id,
      limit: ["confirm_release", "resolve_dispute", "cancel_within_window"].includes(action) ? 10 : 30,
      windowSeconds: 60,
    });

    const escrow = await getEscrow(admin, escrowId);

    if (!(await canAccessEscrow(admin, user.id, escrow))) {
      throw new HttpError(403, "You are not allowed to access this escrow");
    }

    if (action === "upload_document") {
      const result = await uploadDocument(admin, user.id, escrow, body);
      return jsonResponse(200, result);
    }

    if (action === "review_document") {
      const result = await reviewDocument(admin, user.id, escrow, body);
      return jsonResponse(200, result);
    }

    if (action === "confirm_release") {
      if (escrow.payer_user_id !== user.id) {
        throw new HttpError(403, "Only the payer can confirm escrow release");
      }
      const result = await releaseEscrow(admin, user.id, escrow, "Renter confirmed document satisfaction.");
      return jsonResponse(200, result);
    }

    if (action === "raise_dispute") {
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!reason) throw new HttpError(400, "reason is required");
      if (["released", "refunded", "cancelled"].includes(escrow.status)) {
        throw new HttpError(400, "Closed escrows cannot be disputed");
      }

      const { data: updatedEscrow, error } = await admin
        .from("property_escrows")
        .update({
          status: "disputed",
          disputed_at: new Date().toISOString(),
          disputed_by: user.id,
          dispute_reason: reason,
        })
        .eq("id", escrow.id)
        .select("*")
        .single();

      if (error) throw new HttpError(500, error.message);
      await appendEscrowEvent({
        admin,
        escrow: updatedEscrow,
        actorUserId: user.id,
        eventType: "escrow_disputed",
        payload: { reason },
      });
      return jsonResponse(200, { escrow: updatedEscrow });
    }

    if (action === "resolve_dispute") {
      await requirePlatformAdmin(admin, user.id);
      if (escrow.status !== "disputed") {
        throw new HttpError(400, "Only disputed escrows can be resolved");
      }
      const resolution = typeof body?.resolution === "string" ? body.resolution.trim() : "";
      const note = typeof body?.note === "string" ? body.note.trim() : "";
      if (!["release_to_organization", "refund_to_payer"].includes(resolution)) {
        throw new HttpError(400, "resolution must be release_to_organization or refund_to_payer");
      }
      if (!note) throw new HttpError(400, "note is required");

      const result =
        resolution === "release_to_organization"
          ? await releaseEscrow(admin, user.id, escrow, note)
          : await refundEscrow(admin, user.id, escrow, note, "refunded");

      return jsonResponse(200, result);
    }

    if (action === "cancel_within_window") {
      if (escrow.payer_user_id !== user.id) {
        throw new HttpError(403, "Only the payer can cancel this escrow");
      }
      if (!["held", "docs_pending"].includes(escrow.status)) {
        throw new HttpError(400, "Only held escrows can be cancelled");
      }
      if (escrow.cancellation_deadline_at && new Date(escrow.cancellation_deadline_at).getTime() < Date.now()) {
        throw new HttpError(400, "The automatic cancellation window has expired");
      }

      const result = await refundEscrow(
        admin,
        user.id,
        escrow,
        "Cancelled by payer within the escrow cancellation window.",
        "cancelled"
      );
      return jsonResponse(200, result);
    }

    throw new HttpError(400, "Unsupported escrow action");
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("manage-property-escrow error:", error);
    return jsonResponse(500, { error: "Unable to manage escrow" });
  }
});
