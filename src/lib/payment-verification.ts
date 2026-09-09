export type PayangelsSignatureInput = {
  payload: string;
  secret: string;
  signature?: string | null;
};

function normalizeSignature(signature: string) {
  const trimmed = signature.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("sha512=")) return trimmed.slice(7).trim();
  if (lower.startsWith("sha256=")) return trimmed.slice(7).trim();
  return trimmed;
}

async function createSignature(secret: string, payload: string, algorithm: "SHA-256" | "SHA-512") {
  if (!secret || !secret.trim()) {
    throw new Error("Missing payment webhook secret");
  }

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.subtle) {
    const enc = new TextEncoder();
    const key = await cryptoApi.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: algorithm },
      false,
      ["sign"]
    );
    const signatureBytes = await cryptoApi.subtle.sign("HMAC", key, enc.encode(payload));
    return Array.from(new Uint8Array(signatureBytes))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  throw new Error("Web Crypto HMAC support is unavailable in this runtime.");
}

export async function verifyPayangelsSignature(input: PayangelsSignatureInput): Promise<boolean> {
  const { payload, secret, signature } = input;

  if (!secret || !secret.trim()) {
    throw new Error("Missing payment webhook secret");
  }

  if (!signature || !signature.trim()) {
    return false;
  }

  const normalized = normalizeSignature(signature);
  const [sha512, sha256] = await Promise.all([
    createSignature(secret, payload, "SHA-512"),
    createSignature(secret, payload, "SHA-256"),
  ]);

  return normalized === sha512 || normalized === sha256;
}

/** Build a production-compatible webhook signature header value (SHA-512, no prefix). */
export async function buildPayangelsWebhookSignature(payload: string, secret: string) {
  return createSignature(secret, payload, "SHA-512");
}
