import type { EsigSigner } from "./esignature.service";

function randomSignerToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Secure randomness is required to create a signer token");
}

export function withSignerTokens(signers: EsigSigner[]): EsigSigner[] {
  return signers.map((signer) => ({
    ...signer,
    signer_token: signer.signer_token || randomSignerToken(),
  }));
}

export function buildPublicSigningUrl(publicSignToken: string, signerToken?: string | null) {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : import.meta.env.VITE_PUBLIC_APP_URL || "https://app.baytmiftah.com";
  const root = `${String(base).replace(/\/+$/, "")}/sign/${publicSignToken}`;
  return signerToken ? `${root}?st=${encodeURIComponent(signerToken)}` : root;
}

export function findSignerByToken(signers: EsigSigner[], signerToken?: string | null) {
  if (!signerToken) return null;
  return signers.find((signer) => signer.signer_token === signerToken) || null;
}

export function findNextPendingSigner(signers: EsigSigner[]) {
  return [...signers]
    .sort(
      (a, b) =>
        (a.routing_order ?? Number.MAX_SAFE_INTEGER) - (b.routing_order ?? Number.MAX_SAFE_INTEGER),
    )
    .find((signer) => signer.status !== "signed" && !signer.signed_at);
}

/** Relative app path for in-app navigation (preserves ?st= signer token). */
export function buildSigningActionPath(
  signingUrl?: string | null,
  fallback = "/app/leases",
): string {
  const value = String(signingUrl || "").trim();
  if (!value) return fallback;

  try {
    const parsed = value.startsWith("http")
      ? new URL(value)
      : new URL(value, "https://app.baytmiftah.com");
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/sign/") ? path : path || fallback;
  } catch {
    return value.startsWith("/") ? value : fallback;
  }
}
