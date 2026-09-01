export type PayangelsSignatureInput = {
  payload: string;
  secret: string;
  signature?: string | null;
};

async function createSignature(secret: string, payload: string): Promise<string> {
  if (!secret || !secret.trim()) {
    throw new Error('Missing payment webhook secret');
  }

  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.subtle) {
    const enc = new TextEncoder();
    const key = await cryptoApi.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBytes = await cryptoApi.subtle.sign('HMAC', key, enc.encode(payload));
    return Array.from(new Uint8Array(signatureBytes))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  throw new Error('Web Crypto HMAC support is unavailable in this runtime.');
}

export async function verifyPayangelsSignature(input: PayangelsSignatureInput): Promise<boolean> {
  const { payload, secret, signature } = input;

  if (!secret || !secret.trim()) {
    throw new Error('Missing payment webhook secret');
  }

  if (!signature || !signature.trim()) {
    return false;
  }

  const expected = `sha256=${await createSignature(secret, payload)}`;
  return signature.trim() === expected;
}
