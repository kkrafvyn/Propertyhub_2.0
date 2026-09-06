async function hmacSha256Base64(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export type SmileEnvironment = "sandbox" | "production";

export function resolveSmileConfig() {
  const partnerId = Deno.env.get("SMILE_PARTNER_ID")?.trim();
  const apiKey = Deno.env.get("SMILE_API_KEY")?.trim();
  const environment = (Deno.env.get("SMILE_ENVIRONMENT")?.trim().toLowerCase() ||
    "sandbox") as SmileEnvironment;
  const callbackUrl = Deno.env.get("SMILE_CALLBACK_URL")?.trim() || "";

  if (!partnerId || !apiKey) {
    return null;
  }

  const baseUrl =
    environment === "production"
      ? "https://api.smileidentity.com/v1"
      : "https://testapi.smileidentity.com/v1";

  return { partnerId, apiKey, environment, callbackUrl, baseUrl };
}

export function isSmileConfigured() {
  return resolveSmileConfig() !== null;
}

/** Smile Identity request signature (server-side). */
export async function generateSmileSignature(
  partnerId: string,
  apiKey: string,
  timestamp?: string,
) {
  const ts = timestamp || new Date().toISOString();
  const message = `${ts}${partnerId}sid_request`;
  const signature = await hmacSha256Base64(message, apiKey);
  return { timestamp: ts, signature };
}

export async function confirmSmileSignature(
  partnerId: string,
  apiKey: string,
  timestamp: string,
  signature: string,
) {
  const expected = await generateSmileSignature(partnerId, apiKey, timestamp);
  return expected.signature === signature;
}

export function mapDocumentTypeToSmileIdType(
  documentType: string | null | undefined,
  jurisdictionId: string | null | undefined,
): string {
  const jurisdiction = (jurisdictionId || "GH").toUpperCase();
  if (documentType === "ghana_card" || (jurisdiction === "GH" && documentType === "national_id")) {
    return "GHANA_CARD";
  }
  if (documentType === "passport") return "PASSPORT";
  if (documentType === "drivers_license") return "DRIVERS_LICENSE";
  return jurisdiction === "GH" ? "GHANA_CARD" : "NATIONAL_ID";
}

export type SmileAsyncVerificationInput = {
  country: string;
  idType: string;
  idNumber: string;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  jobId: string;
  userId: string;
};

export async function submitSmileAsyncIdVerification(input: SmileAsyncVerificationInput) {
  const config = resolveSmileConfig();
  if (!config) {
    throw new Error("Smile Identity is not configured");
  }

  const { timestamp, signature } = await generateSmileSignature(config.partnerId, config.apiKey);
  const nameParts = (input.firstName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "Applicant";
  const lastName = nameParts.slice(1).join(" ") || firstName;

  const payload = {
    partner_id: config.partnerId,
    timestamp,
    signature,
    country: input.country.toUpperCase(),
    id_type: input.idType,
    id_number: input.idNumber,
    callback_url: config.callbackUrl || undefined,
    partner_params: {
      job_id: input.jobId,
      user_id: input.userId,
      job_type: 5,
    },
    source_sdk: "rest_api",
    source_sdk_version: "2.0.0",
    first_name: firstName,
    last_name: lastName,
    dob: input.dob || undefined,
  };

  const response = await fetch(`${config.baseUrl}/async_id_verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body === "object" && body && "error" in body
        ? String((body as { error?: string }).error)
        : `Smile Identity request failed (${response.status})`;
    throw new Error(message);
  }

  return body as Record<string, unknown>;
}
