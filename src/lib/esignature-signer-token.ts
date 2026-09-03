import type { EsigSigner } from "./esignature.service";

function randomSignerToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
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
