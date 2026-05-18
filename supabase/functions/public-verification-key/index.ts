import { corsHeaders, jsonResponse } from "../_shared/http.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const publicKeyPem = Deno.env.get("AUDIT_RSA_PUBLIC_KEY_PEM");
  if (!publicKeyPem) {
    return jsonResponse(503, {
      configured: false,
      error: "Public verification key is not configured",
    });
  }

  return jsonResponse(
    200,
    {
      configured: true,
      keyId: Deno.env.get("AUDIT_RSA_PUBLIC_KEY_ID") || "baytmiftah-rsa-v1",
      algorithm: "RSA-PSS-SHA256",
      publicKeyPem,
      publishedAt: new Date().toISOString(),
    },
    {
      "Cache-Control": "public, max-age=3600",
    }
  );
});
