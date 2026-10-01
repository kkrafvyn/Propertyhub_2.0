export type PremblyResult = {
  provider_status: "verified" | "rejected" | "review";
  ai_recommendation: "approve" | "reject" | "review";
  ai_screening_status: "completed";
  ai_summary: string;
};

export function resolvePremblyApiConfig() {
  const apiKey = Deno.env.get("PREMBLY_API_KEY")?.trim();
  const appId = Deno.env.get("PREMBLY_APP_ID")?.trim() || "";
  const baseUrl = (Deno.env.get("PREMBLY_BASE_URL")?.trim() || "https://api.prembly.com").replace(/\/$/, "");

  if (!apiKey) return null;
  return { apiKey, appId, baseUrl };
}

export function resolvePremblyConfig() {
  const apiConfig = resolvePremblyApiConfig();
  const verificationPath = Deno.env.get("PREMBLY_VERIFICATION_PATH")?.trim();

  if (!apiConfig || !verificationPath) return null;
  if (!verificationPath.startsWith("/") || verificationPath.startsWith("//")) {
    throw new Error("PREMBLY_VERIFICATION_PATH must be an absolute API path, not a URL");
  }

  return { ...apiConfig, verificationPath };
}

export function selectPremblyVerificationPath(
  pathsJson: string | undefined,
  country: string,
  documentType: string,
  fallback: string,
) {
  if (!pathsJson?.trim()) return fallback;
  let paths: Record<string, string>;
  try {
    paths = JSON.parse(pathsJson);
  } catch {
    throw new Error("PREMBLY_VERIFICATION_PATHS_JSON must be valid JSON");
  }
  const normalizedCountry = country.trim().toUpperCase();
  const selected = paths[`${normalizedCountry}:${documentType}`] ?? paths[normalizedCountry] ?? fallback;
  if (!selected.startsWith("/") || selected.startsWith("//")) {
    throw new Error("Prembly verification paths must be absolute API paths, not URLs");
  }
  return selected;
}

export function isPremblyConfigured() {
  return resolvePremblyConfig() !== null;
}

export function mapPremblyResult(payload: Record<string, unknown>): PremblyResult {
  const verification = payload.verification && typeof payload.verification === "object"
    ? payload.verification as Record<string, unknown>
    : {};
  const status = String(
    verification.status ?? payload.verification_status ?? payload.status ?? "",
  ).trim().toUpperCase();
  const responseCode = String(payload.response_code ?? "").trim();

  if (status === "VERIFIED" && responseCode === "00") {
    return {
      provider_status: "verified",
      ai_recommendation: "approve",
      ai_screening_status: "completed",
      ai_summary: "Prembly returned a verified identity match. Final compliance review remains required.",
    };
  }
  if (status === "NOT-VERIFIED" || responseCode === "01") {
    return {
      provider_status: "rejected",
      ai_recommendation: "reject",
      ai_screening_status: "completed",
      ai_summary: "Prembly could not verify the submitted identity.",
    };
  }
  return {
    provider_status: "review",
    ai_recommendation: "review",
    ai_screening_status: "completed",
    ai_summary: "Prembly returned a pending or inconclusive result. Manual review is required.",
  };
}

export function getPremblyReference(payload: Record<string, unknown>) {
  const verification = payload.verification && typeof payload.verification === "object"
    ? payload.verification as Record<string, unknown>
    : {};
  const value = verification.reference ?? verification.verification_id ??
    payload.reference_id ?? payload.transaction_id;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function hmacSha256Base64(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  let binary = "";
  for (const byte of new Uint8Array(signature)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function verifyPremblyWebhookSignature(
  rawBody: string,
  signature: string,
  publicKey: string,
) {
  if (!rawBody || !signature || !publicKey) return false;
  const expected = await hmacSha256Base64(rawBody, publicKey);
  if (expected.length !== signature.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  }
  return difference === 0;
}

export function getPremblySubmissionId(payload: Record<string, unknown>) {
  const data = payload.data && typeof payload.data === "object"
    ? payload.data as Record<string, unknown>
    : {};
  const widgetInfo = data.widget_info && typeof data.widget_info === "object"
    ? data.widget_info as Record<string, unknown>
    : {};
  const candidates = [payload.metadata, data.metadata, widgetInfo.metadata];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const metadata = candidate as Record<string, unknown>;
    const value = metadata.submission_id ?? metadata.transaction_id;
    if (typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value)) return value;
  }
  return null;
}

export async function submitPremblyVerification(input: {
  idNumber: string;
  country: string;
  documentType: string;
  fullName?: string | null;
  dob?: string | null;
  reference: string;
}) {
  const config = resolvePremblyConfig();
  if (!config) throw new Error("Prembly is not configured");
  const verificationPath = selectPremblyVerificationPath(
    Deno.env.get("PREMBLY_VERIFICATION_PATHS_JSON"),
    input.country,
    input.documentType,
    config.verificationPath,
  );
  const names = (input.fullName || "").trim().split(/\s+/).filter(Boolean);
  const response = await fetch(`${config.baseUrl}${verificationPath}`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      ...(config.appId ? { "app-id": config.appId } : {}),
    },
    body: JSON.stringify({
      id_number: input.idNumber,
      number: input.idNumber,
      country: input.country.toUpperCase(),
      document_type: input.documentType,
      first_name: names[0] || undefined,
      last_name: names.slice(1).join(" ") || undefined,
      dob: input.dob || undefined,
      reference: input.reference,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Prembly request failed (${response.status})`);
  return body as Record<string, unknown>;
}

export async function fetchPremblySession(sessionId: string) {
  const config = resolvePremblyApiConfig();
  const organisationId = Deno.env.get("PREMBLY_ORGANISATION_ID")?.trim();
  if (!config || !organisationId) throw new Error("Prembly session retrieval is not configured");
  if (!/^[A-Za-z0-9_-]{6,200}$/.test(sessionId)) throw new Error("Invalid Prembly session ID");
  const response = await fetch(
    `${config.baseUrl}/api/v1/checker-widget/sdk/sessions/${encodeURIComponent(sessionId)}/`,
    { headers: { "accept": "application/json", "x-api-key": config.apiKey, "x-organisation-id": organisationId } },
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Prembly session retrieval failed (${response.status})`);
  return body as Record<string, unknown>;
}
