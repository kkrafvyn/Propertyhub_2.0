import { getCorsHeaders, HttpError, jsonResponse, safeErrorMessage } from "../_shared/http.ts";
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
    await requireAuthenticatedUser(authHeader);

    const body = await req.json().catch(() => null);
    if (!body?.envelope || !body?.esignatureRequestId) {
      throw new HttpError(400, "envelope and esignatureRequestId required");
    }

    const envelope = body.envelope as EnvelopeDraft;
    const esignatureRequestId = String(body.esignatureRequestId);
    const accountId = Deno.env.get("DOCUSIGN_ACCOUNT_ID");
    const baseUrl = (Deno.env.get("DOCUSIGN_BASE_URL") || "https://demo.docusign.net").replace(/\/+$/, "");
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

    const response = await fetch(`${baseUrl}/restapi/v2.1/accounts/${accountId}/envelopes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new HttpError(502, `DocuSign API error: ${detail.slice(0, 200)}`);
    }

    const result = await response.json();
    const envelopeId = String(result.envelopeId);
    const status = String(result.status || "sent");
    const signingUrl = result.uri ? `${baseUrl}${result.uri}` : null;

    const admin = createAdminClient();
    await admin
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
      .eq("id", esignatureRequestId);

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
