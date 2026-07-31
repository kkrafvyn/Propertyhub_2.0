import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import {
  type AiSource,
  isLlmConfigured,
  resolveAiProvider,
  visionChatCompletion,
} from "../_shared/llm-provider.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

type KycRecommendation = "approve" | "review" | "reject";

type ScreeningResult = {
  ai_screening_status: "completed" | "failed" | "skipped";
  ai_confidence_score: number;
  ai_recommendation: KycRecommendation;
  ai_extracted_data: Record<string, unknown>;
  ai_flags: string[];
  ai_summary: string;
  ai_source: AiSource;
  status?: "in_review";
};

function normalizeText(value?: string | null) {
  return (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeName(value?: string | null) {
  return normalizeText(value);
}

function guessMimeType(storagePath: string) {
  const lower = storagePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "image/jpeg";
}

function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function isPlatformAdmin(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .from("users")
    .select("is_platform_admin")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_platform_admin);
}

function ruleBasedScreen(submission: {
  full_name?: string | null;
  document_number?: string | null;
  document_type?: string | null;
  date_of_birth?: string | null;
  storage_path?: string | null;
}): ScreeningResult {
  const flags: string[] = [];
  let score = 40;

  if (!submission.storage_path) {
    flags.push("missing_document");
  } else {
    score += 20;
    if (submission.storage_path.toLowerCase().endsWith(".pdf")) {
      flags.push("pdf_requires_manual_review");
    }
  }

  if (!submission.full_name?.trim()) {
    flags.push("missing_full_name");
  } else {
    score += 15;
  }

  if (!submission.document_number?.trim()) {
    flags.push("missing_document_number");
  } else {
    score += 10;
  }

  if (!submission.date_of_birth) {
    flags.push("missing_date_of_birth");
  } else {
    score += 5;
  }

  const recommendation: KycRecommendation = flags.includes("missing_document")
    ? "reject"
    : score >= 75 && flags.length === 0
      ? "approve"
      : "review";

  return {
    ai_screening_status: "completed",
    ai_confidence_score: Math.min(score, 80),
    ai_recommendation: recommendation,
    ai_extracted_data: {
      method: "rules",
      submitted_full_name: submission.full_name,
      submitted_document_number: submission.document_number,
      submitted_document_type: submission.document_type,
    },
    ai_flags: flags,
    ai_summary:
      flags.length > 0
        ? `Rule-based pre-check flagged: ${flags.join(", ").replace(/_/g, " ")}. A human reviewer will confirm.`
        : "Basic field checks passed. A human reviewer will still confirm your identity document.",
    ai_source: "local",
    status: "in_review",
  };
}

function mergeVisionScreening(
  submission: {
    full_name?: string | null;
    document_number?: string | null;
    document_type?: string | null;
    date_of_birth?: string | null;
  },
  visionPayload: Record<string, unknown>,
  source: AiSource,
): ScreeningResult {
  const flags = Array.isArray(visionPayload.flags)
    ? visionPayload.flags.filter((flag): flag is string => typeof flag === "string")
    : [];

  const extractedName =
    typeof visionPayload.extracted_full_name === "string" ? visionPayload.extracted_full_name : "";
  const extractedNumber =
    typeof visionPayload.extracted_document_number === "string"
      ? visionPayload.extracted_document_number
      : "";
  const documentReadable = visionPayload.document_readable !== false;
  const expired = visionPayload.expired === true;

  if (!documentReadable) flags.push("document_unreadable");
  if (expired) flags.push("document_expired");

  if (submission.full_name && extractedName) {
    const submitted = normalizeName(submission.full_name);
    const extracted = normalizeName(extractedName);
    if (submitted && extracted && submitted !== extracted && !submitted.includes(extracted) && !extracted.includes(submitted)) {
      flags.push("name_mismatch");
    }
  }

  if (submission.document_number && extractedNumber) {
    if (normalizeText(submission.document_number) !== normalizeText(extractedNumber)) {
      flags.push("document_number_mismatch");
    }
  }

  const uniqueFlags = [...new Set(flags)];
  let score =
    typeof visionPayload.confidence_score === "number"
      ? Math.round(visionPayload.confidence_score)
      : 65;

  if (uniqueFlags.includes("document_unreadable")) score = Math.min(score, 25);
  if (uniqueFlags.includes("name_mismatch")) score = Math.min(score, 45);
  if (uniqueFlags.includes("document_number_mismatch")) score = Math.min(score, 50);
  if (uniqueFlags.includes("document_expired")) score = Math.min(score, 20);

  let recommendation: KycRecommendation = "review";
  if (
    typeof visionPayload.recommendation === "string" &&
    ["approve", "review", "reject"].includes(visionPayload.recommendation)
  ) {
    recommendation = visionPayload.recommendation as KycRecommendation;
  }

  if (uniqueFlags.includes("document_unreadable") || uniqueFlags.includes("document_expired")) {
    recommendation = "reject";
  } else if (score >= 88 && uniqueFlags.length === 0) {
    recommendation = "approve";
  } else {
    recommendation = "review";
  }

  const summary =
    typeof visionPayload.summary === "string" && visionPayload.summary.trim()
      ? visionPayload.summary.trim()
      : uniqueFlags.length > 0
        ? `AI pre-screen flagged: ${uniqueFlags.join(", ").replace(/_/g, " ")}.`
        : "AI pre-screen completed with no major mismatches. Human review still required.";

  return {
    ai_screening_status: "completed",
    ai_confidence_score: Math.max(0, Math.min(score, 100)),
    ai_recommendation: recommendation,
    ai_extracted_data: {
      method: "vision",
      extracted_full_name: extractedName || null,
      extracted_document_number: extractedNumber || null,
      extracted_date_of_birth: visionPayload.extracted_date_of_birth ?? null,
      document_type_detected: visionPayload.document_type_detected ?? null,
      document_readable: documentReadable,
      expired,
    },
    ai_flags: uniqueFlags,
    ai_summary: summary,
    ai_source: source,
    status: "in_review",
  };
}

async function screenWithVision(
  submission: {
    full_name?: string | null;
    document_number?: string | null;
    document_type?: string | null;
    date_of_birth?: string | null;
    storage_path?: string | null;
  },
  imageBase64: string,
  mimeType: string,
): Promise<ScreeningResult | null> {
  const provider = resolveAiProvider();
  if (!provider) return null;

  const prompt = `You are a KYC document pre-screening assistant for a Ghana property marketplace.
Analyze the identity document image and compare it to the submitted applicant data.
Return ONLY valid JSON with this shape:
{
  "extracted_full_name": string,
  "extracted_document_number": string,
  "extracted_date_of_birth": string | null,
  "document_type_detected": string,
  "document_readable": boolean,
  "expired": boolean,
  "flags": string[],
  "confidence_score": number,
  "recommendation": "approve" | "review" | "reject",
  "summary": string
}

Submitted applicant data:
- full_name: ${submission.full_name || "unknown"}
- document_number: ${submission.document_number || "unknown"}
- document_type: ${submission.document_type || "unknown"}
- date_of_birth: ${submission.date_of_birth || "unknown"}

Rules:
- recommendation "approve" only when the document is clearly readable, not expired, and names/numbers align.
- recommendation "reject" only for clearly unreadable, wrong document type, or expired ID.
- otherwise use "review".
- Do not claim legal verification; this is advisory pre-screening only.`;

  const raw = await visionChatCompletion({
    responseFormat: "json_object",
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
  });

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return mergeVisionScreening(submission, parsed, provider);
  } catch (error) {
    console.warn("Unable to parse vision screening JSON:", error);
    return null;
  }
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
    const { user } = await requireAuthenticatedUser(authHeader);
    const body = await req.json().catch(() => null);
    const submissionId =
      typeof body?.submissionId === "string" ? body.submissionId.trim() : "";

    if (!submissionId) {
      throw new HttpError(400, "submissionId is required");
    }

    const admin = createAdminClient();
    const { data: submission, error: submissionError } = await admin
      .from("kyc_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) {
      throw new HttpError(500, submissionError.message);
    }

    if (!submission) {
      throw new HttpError(404, "KYC submission not found");
    }

    const ownsSubmission = submission.user_id === user.id;
    const adminReviewer = await isPlatformAdmin(admin, user.id);
    if (!ownsSubmission && !adminReviewer) {
      throw new HttpError(403, "You are not allowed to screen this submission");
    }

    if (!["submitted", "in_review"].includes(submission.status)) {
      throw new HttpError(400, "Submission is not eligible for AI screening");
    }

    await admin
      .from("kyc_submissions")
      .update({
        ai_screening_status: "processing",
        ai_summary: "AI pre-screening in progress…",
      })
      .eq("id", submissionId);

    const bucket = Deno.env.get("PROPERTY_MEDIA_BUCKET") || "property-media";
    let screening: ScreeningResult;

    if (!submission.storage_path) {
      screening = ruleBasedScreen(submission);
    } else {
      const mimeType = guessMimeType(submission.storage_path);
      const { data: file, error: downloadError } = await admin.storage
        .from(bucket)
        .download(submission.storage_path);

      if (downloadError || !file) {
        screening = {
          ...ruleBasedScreen(submission),
          ai_flags: [...ruleBasedScreen(submission).ai_flags, "document_download_failed"],
          ai_recommendation: "review",
          ai_summary: "Could not read the uploaded document for AI analysis. Manual review required.",
        };
      } else if (!isImageMime(mimeType)) {
        screening = {
          ...ruleBasedScreen(submission),
          ai_flags: [...ruleBasedScreen(submission).ai_flags, "pdf_requires_manual_review"],
          ai_recommendation: "review",
          ai_summary: "PDF uploaded — automated image analysis skipped. A reviewer will inspect the file manually.",
          ai_screening_status: "skipped",
        };
      } else {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const imageBase64 = bytesToBase64(bytes);

        try {
          const visionResult = isLlmConfigured()
            ? await screenWithVision(submission, imageBase64, mimeType)
            : null;
          screening = visionResult || ruleBasedScreen(submission);
        } catch (error) {
          console.warn("Vision screening failed, using rules:", error);
          screening = {
            ...ruleBasedScreen(submission),
            ai_flags: [...ruleBasedScreen(submission).ai_flags, "vision_provider_error"],
            ai_recommendation: "review",
            ai_summary: "AI vision provider unavailable. Rule-based checks applied; manual review required.",
          };
        }
      }
    }

    const { data: updated, error: updateError } = await admin
      .from("kyc_submissions")
      .update({
        ...screening,
        ai_screened_at: new Date().toISOString(),
      })
      .eq("id", submissionId)
      .select("*")
      .single();

    if (updateError) {
      throw new HttpError(500, updateError.message);
    }

    return jsonResponse(200, {
      ok: true,
      submission: updated,
      screening,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("kyc-ai-screen error:", error);
    return jsonResponse(500, { error: "Unable to screen KYC submission" });
  }
});
