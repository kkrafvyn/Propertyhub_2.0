import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
import { requireOrgMembership } from "../_shared/org-auth.ts";
import { enforceRateLimit, rateLimitKey } from "../_shared/rate-limit.ts";
import { requireAuthenticatedUser, createAdminClient } from "../_shared/supabase.ts";

type EnvelopeDraft = {
  emailSubject: string;
  documents: Array<{ name: string; fileExtension: string; documentBase64?: string }>;
  signers: Array<{ name: string; email: string; recipientId: string; routingOrder: string }>;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" }, req);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user } = await requireAuthenticatedUser(authHeader);
    await enforceRateLimit({
      bucket: rateLimitKey("docusign-envelope", user.id),
      maxHits: 5,
      windowSeconds: 3600,
    });

    const body = await req.json().catch(() => null);
    if (!body?.esignatureRequestId) {
      throw new HttpError(400, "esignatureRequestId is required");
    }

    const esignatureRequestId = String(body.esignatureRequestId);
    const admin = createAdminClient();
    const { data: signatureRequest, error: requestError } = await admin
      .from("esignature_requests")
      .select("id, organization_id, lease_id, document_name, document_body, signers, status, provider, provider_request_id, created_by, metadata")
      .eq("id", esignatureRequestId)
      .maybeSingle();
    if (requestError) throw new HttpError(500, "Unable to load signature request");
    if (!signatureRequest) throw new HttpError(404, "Signature request not found");

    const membership = await requireOrgMembership(admin, user.id, signatureRequest.organization_id, [
      "owner", "organization_admin", "managing_director", "manager", "property_manager", "agent",
    ]);
    if (!signatureRequest.lease_id || signatureRequest.status !== "draft" || signatureRequest.provider_request_id) {
      throw new HttpError(409, "Signature request is not an eligible draft");
    }
    if (signatureRequest.created_by !== user.id && !["owner", "organization_admin", "managing_director"].includes(membership.role)) {
      throw new HttpError(403, "You cannot send another user's signature request");
    }
    const { data: lease, error: leaseError } = await admin
      .from("leases")
      .select("id, organization_id, tenant_user_id, tenant:users!leases_tenant_user_id_fkey(email, full_name)")
      .eq("id", signatureRequest.lease_id)
      .maybeSingle();
    if (leaseError || !lease || lease.organization_id !== signatureRequest.organization_id) {
      throw new HttpError(403, "Signature request lease does not belong to this organization");
    }
    const leaseTenant = Array.isArray(lease.tenant) ? lease.tenant[0] : lease.tenant;
    const storedSigners = Array.isArray(signatureRequest.signers) ? signatureRequest.signers as Array<Record<string, unknown>> : [];
    const allowedSignerEmails = new Set([String(leaseTenant?.email || "").toLowerCase()]);
    const { data: admins, error: adminsError } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", signatureRequest.organization_id)
      .in("role", ["owner", "organization_admin", "managing_director"]);
    if (adminsError) throw new HttpError(500, "Unable to validate organization signers");
    const adminUserIds = (admins || []).map((member) => member.user_id);
    if (adminUserIds.length) {
      const { data: adminUsers, error: adminUsersError } = await admin
        .from("users")
        .select("email")
        .in("id", adminUserIds);
      if (adminUsersError) throw new HttpError(500, "Unable to validate organization signers");
      for (const adminUser of adminUsers || []) {
        if (adminUser.email) allowedSignerEmails.add(adminUser.email.toLowerCase());
      }
    }
    const signers = storedSigners.filter((signer) => {
      const email = typeof signer.email === "string" ? signer.email.toLowerCase() : "";
      return email && allowedSignerEmails.has(email);
    });
    if (!signers.length || !signatureRequest.document_body?.trim()) {
      throw new HttpError(400, "Signature request must contain its lease tenant and document body");
    }
    const utf8 = new TextEncoder().encode(signatureRequest.document_body);
    let binary = "";
    for (const byte of utf8) binary += String.fromCharCode(byte);
    const envelope: EnvelopeDraft = {
      emailSubject: `Please sign: ${String(signatureRequest.document_name || "Lease agreement").slice(0, 120)}`,
      documents: [{
        name: String(signatureRequest.document_name || "Lease agreement").replace(/[^\w\s-]/g, "").slice(0, 80) || "LeaseAgreement",
        fileExtension: "txt",
        documentBase64: btoa(binary),
      }],
      signers: signers.map((signer, index) => ({
        name: String(signer.name || leaseTenant?.full_name || "Tenant").slice(0, 120),
        email: String(signer.email),
        recipientId: String(index + 1),
        routingOrder: String(signer.routing_order || signer.routingOrder || index + 1),
      })),
    };
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const configuredBaseUrl = Deno.env.get("DOCUSIGN_BASE_URL");
    if (!configuredBaseUrl) throw new HttpError(503, "DocuSign base URL is not configured");
    const baseUrl = configuredBaseUrl.replace(/\/+$/, "");
    let parsedBaseUrl: URL;
    try { parsedBaseUrl = new URL(baseUrl); } catch { throw new HttpError(503, "DocuSign endpoint is invalid"); }
    if (parsedBaseUrl.protocol !== "https:" || !/(^|\.)docusign\.(net|com)$/i.test(parsedBaseUrl.hostname)) {
      throw new HttpError(503, "DocuSign endpoint is not an approved provider host");
    }
    const accessToken = Deno.env.get("DOCUSIGN_ACCESS_TOKEN");

    if (!accountId || !accessToken) {
      throw new HttpError(503, "DocuSign is not configured");
    }

    const doc = envelope.documents?.[0];
    const signer = envelope.signers?.[0];
    if (!doc || !signer) {
      throw new HttpError(400, "Envelope requires at least one document and signer");
    }

    const payload = {
      transactionId: esignatureRequestId,
      emailSubject: envelope.emailSubject,
      status: "sent",
      documents: [
        {
          documentBase64: doc.documentBase64,
          name: doc.name,
          fileExtension: doc.fileExtension || "txt",
          documentId: "1",
        },
      ],
      recipients: {
        signers: [
          {
            email: signer.email,
            name: signer.name,
            recipientId: signer.recipientId || "1",
            routingOrder: signer.routingOrder || "1",
            tabs: {
              signHereTabs: [{ documentId: "1", pageNumber: "1", xPosition: "100", yPosition: "700" }],
            },
          },
        ],
      },
    };

    const originalMetadata = (signatureRequest as { metadata?: Record<string, unknown> | null }).metadata || {};
    const dispatchClaim = await admin
      .from("esignature_requests")
      .update({
        provider: "docusign",
        status: "sent",
        metadata: { ...originalMetadata, docusignDispatchStartedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      })
      .eq("id", esignatureRequestId)
      .eq("organization_id", signatureRequest.organization_id)
      .eq("status", "draft")
      .is("provider_request_id", null)
      .select("id")
      .maybeSingle();
    if (dispatchClaim.error || !dispatchClaim.data) {
      throw new HttpError(409, "Signature request is already being sent or is no longer a draft");
    }

    const restoreDraft = async () => {
      await admin.from("esignature_requests").update({
        provider: signatureRequest.provider,
        status: "draft",
        metadata: originalMetadata,
        updated_at: new Date().toISOString(),
      })
        .eq("id", esignatureRequestId)
        .eq("organization_id", signatureRequest.organization_id)
        .eq("status", "sent")
        .is("provider_request_id", null);
    };

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/restapi/v2.1/accounts/${accountId}/envelopes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch {
      await restoreDraft();
      throw new HttpError(502, "DocuSign request failed before a response was received");
    }

    if (!response.ok) {
      await response.body?.cancel();
      await restoreDraft();
      throw new HttpError(502, "DocuSign rejected the envelope request");
    }

    let result: Record<string, unknown>;
    try {
      result = await response.json();
    } catch {
      await restoreDraft();
      throw new HttpError(502, "DocuSign returned an invalid response");
    }
    const envelopeId = String(result.envelopeId);
    if (!envelopeId || envelopeId === "undefined") {
      await restoreDraft();
      throw new HttpError(502, "DocuSign response did not include an envelope identifier");
    }
    const status = String(result.status || "sent");
    const signingUrl = result.uri ? `${baseUrl}${result.uri}` : null;

    const { data: updated, error: updateError } = await admin
      .from("esignature_requests")
      .update({
        provider: "docusign",
        provider_request_id: envelopeId,
        status,
        updated_at: new Date().toISOString(),
        metadata: {
          docusignEnvelopeId: envelopeId,
          docusignSimulated: false,
          docusignSigningUrl: signingUrl,
        },
      })
      .eq("id", esignatureRequestId)
      .eq("organization_id", signatureRequest.organization_id)
      .eq("status", "sent")
      .is("provider_request_id", null)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) throw new HttpError(409, "Signature request changed before it could be sent");

    return jsonResponse(
      200,
      { envelopeId, status, simulated: false, signingUrl },
      req,
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message }, req);
    }
    console.error("create-docusign-envelope error:", error);
    return jsonResponse(500, { error: safeErrorMessage(error, "DocuSign envelope creation failed") }, req);
  }
});
