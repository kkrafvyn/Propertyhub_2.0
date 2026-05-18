import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { sha256Hex } from "../_shared/cryptographic-audit.ts";
import { createAdminClient } from "../_shared/supabase.ts";

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

function base64Encode(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
}

async function publishGitHubAnchor(payload: Record<string, unknown>) {
  const token = Deno.env.get("GITHUB_ANCHOR_TOKEN");
  const repo = Deno.env.get("GITHUB_ANCHOR_REPO");
  const branch = Deno.env.get("GITHUB_ANCHOR_BRANCH") || "main";

  if (!token || !repo) {
    return null;
  }

  const date = new Date().toISOString().slice(0, 10);
  const path = `anchors/${date}.json`;
  const apiBase = `https://api.github.com/repos/${repo}/contents/${path}`;
  const content = base64Encode(JSON.stringify(payload, null, 2));

  let sha: string | undefined;
  const existing = await fetch(`${apiBase}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (existing.ok) {
    const body = await existing.json();
    sha = typeof body.sha === "string" ? body.sha : undefined;
  }

  const response = await fetch(apiBase, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      branch,
      message: `Anchor BaytMiftah trust log ${date}`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new HttpError(502, `GitHub anchor failed: ${errorText}`);
  }

  const body = await response.json();
  return body?.content?.html_url || body?.commit?.html_url || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "Method not allowed");
    }

    const expectedSecret = Deno.env.get("ANCHOR_JOB_SECRET");
    if (!expectedSecret) {
      throw new HttpError(500, "ANCHOR_JOB_SECRET is not configured");
    }

    if (req.headers.get("x-anchor-secret") !== expectedSecret) {
      throw new HttpError(401, "Invalid anchor secret");
    }

    const admin = createAdminClient();
    const { count, error: countError } = await admin
      .from("integrity_audit_log")
      .select("id", { count: "exact", head: true });

    if (countError) {
      throw new HttpError(500, countError.message);
    }

    const { data: latest, error: latestError } = await admin
      .from("integrity_audit_log")
      .select("id, chain_hash, payload_hash, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      throw new HttpError(500, latestError.message);
    }

    const { data: sample, error: sampleError } = await admin
      .from("integrity_audit_log")
      .select("id, chain_hash, payload_hash, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(500);

    if (sampleError) {
      throw new HttpError(500, sampleError.message);
    }

    const anchorPayload = {
      anchoredAt: new Date().toISOString(),
      eventCount: count || 0,
      latestRecordId: latest?.id || null,
      latestChainHash: latest?.chain_hash || "0".repeat(64),
      recentRecords: sample || [],
    };
    const anchorHash = await sha256Hex(stableStringify(anchorPayload));
    const externalReferenceUrl = await publishGitHubAnchor({
      ...anchorPayload,
      anchorHash,
    });

    const { data: anchor, error: insertError } = await admin
      .from("integrity_anchors")
      .insert({
        anchor_hash: anchorHash,
        latest_chain_hash: anchorPayload.latestChainHash,
        event_count: anchorPayload.eventCount,
        anchoring_provider: externalReferenceUrl ? "github" : "internal",
        external_reference_url: externalReferenceUrl,
      })
      .select("*")
      .single();

    if (insertError) {
      throw new HttpError(500, insertError.message);
    }

    return jsonResponse(200, { anchor });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("anchor-integrity-audit error:", error);
    return jsonResponse(500, { error: "Unable to anchor integrity audit" });
  }
});
