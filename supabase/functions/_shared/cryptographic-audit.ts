import { HttpError } from "./http.ts";

const ZERO_HASH = "0".repeat(64);

function encodeBase64(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function normalizePem(pem: string) {
  return pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const objectValue = value as Record<string, unknown>;
  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key])}`)
    .join(",")}}`;
}

export async function sha256Hex(value: string | Uint8Array) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signChainHash(chainHash: string) {
  const privateKeyPem = Deno.env.get("AUDIT_RSA_PRIVATE_KEY_PEM");
  if (!privateKeyPem) {
    return {
      rsaSignature: null,
      publicKeyId: null,
    };
  }

  try {
    const keyData = decodeBase64(normalizePem(privateKeyPem));
    const key = await crypto.subtle.importKey(
      "pkcs8",
      keyData,
      { name: "RSA-PSS", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      { name: "RSA-PSS", saltLength: 32 },
      key,
      new TextEncoder().encode(chainHash)
    );

    return {
      rsaSignature: encodeBase64(signature),
      publicKeyId: Deno.env.get("AUDIT_RSA_PUBLIC_KEY_ID") || "baytmiftah-rsa-v1",
    };
  } catch (error) {
    console.error("RSA audit signing failed:", error);
    throw new HttpError(500, "Audit RSA signing key is invalid");
  }
}

export async function appendIntegrityAuditEvent(input: {
  admin: any;
  eventType: string;
  entityType: string;
  entityId: string;
  organizationId?: string | null;
  actorId?: string | null;
  payload: Record<string, unknown>;
}) {
  const { data: previous, error: previousError } = await input.admin
    .from("integrity_audit_log")
    .select("chain_hash")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousError) {
    throw new HttpError(500, previousError.message);
  }

  const prevHash = previous?.chain_hash || ZERO_HASH;
  const eventPayload = {
    ...input.payload,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    organizationId: input.organizationId || null,
    actorId: input.actorId || null,
  };
  const payloadHash = await sha256Hex(stableStringify(eventPayload));
  const createdAt = new Date().toISOString();
  const chainHash = await sha256Hex(
    stableStringify({
      prevHash,
      payloadHash,
      createdAt,
    })
  );
  const signature = await signChainHash(chainHash);

  const { data, error } = await input.admin
    .from("integrity_audit_log")
    .insert({
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId,
      organization_id: input.organizationId || null,
      actor_id: input.actorId || null,
      payload: eventPayload,
      payload_hash: payloadHash,
      prev_hash: prevHash,
      chain_hash: chainHash,
      rsa_signature: signature.rsaSignature,
      public_key_id: signature.publicKeyId,
      created_at: createdAt,
    })
    .select("*")
    .single();

  if (error) {
    throw new HttpError(500, error.message);
  }

  return data;
}
