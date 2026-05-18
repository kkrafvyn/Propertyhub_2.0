type BinaryLike = string | ArrayBuffer | ArrayBufferView;

const textEncoder = new TextEncoder();

function toUint8Array(value: BinaryLike): Uint8Array {
  if (typeof value === 'string') {
    return textEncoder.encode(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }

  return new Uint8Array(value);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value: BinaryLike): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    toUint8Array(value) as BufferSource
  );
  return bytesToHex(new Uint8Array(digest));
}

export function utf8Hex(value: string): string {
  return bytesToHex(textEncoder.encode(value));
}
