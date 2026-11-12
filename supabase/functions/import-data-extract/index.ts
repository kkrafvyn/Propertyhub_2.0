import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import { chatCompletion, isLlmConfigured, resolveAiProvider } from "../_shared/llm-provider.ts";
import { requireOrgMembership } from "../_shared/org-auth.ts";
import { reserveAiAction } from '../_shared/ai-budget.ts';
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

const IMPORT_TYPES = [
  "estates_units",
  "occupancies",
  "opening_charges",
  "payments",
  "bank_feed",
] as const;

type ImportType = (typeof IMPORT_TYPES)[number];

const SCHEMA: Record<ImportType, string[]> = {
  estates_units: ["estate_name", "unit_identifier", "block", "floor"],
  occupancies: ["estate_name", "unit_identifier", "user_email", "role", "start_date"],
  opening_charges: ["estate_name", "unit_identifier", "amount", "due_date", "charge_type", "description"],
  payments: ["estate_name", "unit_identifier", "charge_id", "amount", "method", "reference"],
  bank_feed: ["date", "description", "amount", "type", "reference"],
};

function isImportType(value: string): value is ImportType {
  return (IMPORT_TYPES as readonly string[]).includes(value);
}

function matrixFromAiRows(headers: string[], rows: Record<string, unknown>[]): string[][] {
  const matrix: string[][] = [headers];
  for (const row of rows) {
    matrix.push(headers.map((h) => String(row[h] ?? "").trim()));
  }
  return matrix.filter((r, idx) => idx === 0 || r.some((c) => c.length > 0));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user, userClient } = await requireAuthenticatedUser(authHeader);
    const body = await req.json().catch(() => null);

    const organizationId = typeof body?.organizationId === "string" ? body.organizationId.trim() : "";
    const importTypeRaw = typeof body?.importType === "string" ? body.importType.trim() : "";
    const extractedText = typeof body?.extractedText === "string" ? body.extractedText.slice(0, 120_000) : "";
    const matrixSample = Array.isArray(body?.matrixSample) ? body.matrixSample : null;
    const fileName = typeof body?.fileName === "string" ? body.fileName.slice(0, 255) : "import";

    if (!organizationId || !isImportType(importTypeRaw)) {
      throw new HttpError(400, "organizationId and importType are required");
    }

    const admin = createAdminClient();
    await requireOrgMembership(admin, user.id, organizationId, [
      "owner",
      "manager",
      "organization_admin",
      "managing_director",
      "property_manager",
      "finance_manager",
    ]);

    if (!isLlmConfigured()) {
      return jsonResponse(200, {
        skipped: true,
        reason: "AI extraction is not configured on this environment.",
      });
    }

    await reserveAiAction(userClient,organizationId,'ImportAgent','import_data');
    const headers = SCHEMA[importTypeRaw];
    const sampleText = matrixSample
      ? JSON.stringify(matrixSample).slice(0, 8_000)
      : extractedText.slice(0, 12_000);

    if (!sampleText.trim()) {
      throw new HttpError(400, "extractedText or matrixSample is required");
    }

    const prompt = `You extract structured import rows for a property-management system.
Import type: ${importTypeRaw}
Source file: ${fileName}
Required JSON shape: { "rows": [ { ${headers.map((h) => `"${h}": string`).join(", ")} } ], "confidence": number between 0 and 1, "warnings": string[] }
Rules:
- Return ONLY valid JSON matching that shape.
- Use exact header keys listed above for every row object.
- Do not invent data; omit uncertain rows rather than guessing.
- Map synonyms (property→estate_name, unit→unit_identifier, etc.).
Document content:
${sampleText}`;

    const raw = await chatCompletion({
      temperature: 0,
      responseFormat: "json_object",
      messages: [{ role: "user", content: prompt }],
    });

    if (!raw) {
      return jsonResponse(200, { skipped: true, reason: "AI provider returned no content." });
    }

    const parsed = JSON.parse(raw) as {
      rows?: Record<string, unknown>[];
      confidence?: number;
      warnings?: string[];
    };

    const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
    const matrix = matrixFromAiRows(headers, rows);
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.65;
    const warnings = Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((w) => typeof w === "string").slice(0, 10)
      : [];

    return jsonResponse(200, {
      skipped: false,
      matrix,
      confidence,
      warnings,
      method: "ai_assisted",
      provider: resolveAiProvider(),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error("import-data-extract failed:", error);
    return jsonResponse(500, { error: "Import extraction failed" });
  }
});
