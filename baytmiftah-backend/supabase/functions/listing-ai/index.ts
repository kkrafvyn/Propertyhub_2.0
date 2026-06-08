import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";
import { verifyToken } from "../_shared/auth.ts";

function localReview(body: any) {
  const formData = body.formData || body;
  const mediaCount = Number(body.mediaCount || 0);
  const documentCount = Number(body.documentCount || 0);
  const checklist = body.checklist || [];
  const issues = [];
  const suggestions = [];
  const riskSignals = [];

  if (!formData.title) issues.push("Add a clear property title.");
  if ((formData.description || "").length < 80) suggestions.push("Expand the description with location, layout, finishes, and buyer fit.");
  if (!formData.location) issues.push("Add a specific location.");
  if (!formData.price) issues.push("Add a price.");
  if (mediaCount < 3) suggestions.push("Upload at least 3 property images.");
  if (documentCount === 0) riskSignals.push("No verification document staged.");

  const done = checklist.filter((item: any) => item.done).length;
  const score = Math.max(20, Math.min(98, Math.round((done / Math.max(checklist.length, 1)) * 70) + Math.min(mediaCount * 5, 15) + (documentCount ? 10 : 0) - riskSignals.length * 8));

  return {
    score,
    issues,
    suggestions,
    riskSignals,
    titleSuggestion: formData.location ? `${formData.type || "Premium"} residence in ${String(formData.location).split(",")[0]}` : formData.title || "Verified property listing",
    descriptionSuggestion: "Lead with the strongest buyer signal, then cover layout, finishes, location confidence, verification status, and viewing readiness.",
    adminReviewNote: riskSignals.length ? `Review required: ${riskSignals.join(" ")}` : "No major risk signals detected.",
  };
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (req.method !== "POST") return errorResponse("Method not allowed", 405);
    await verifyToken(req.headers.get("Authorization") || undefined);
    const body = await req.json();
    if (JSON.stringify(body).length > 12000) {
      return errorResponse("Listing package is too large", 413);
    }
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return jsonResponse({ ...localReview(body), source: "local" });

    const prompt = `Review this real-estate listing package and return strict JSON with keys score, issues, suggestions, riskSignals, titleSuggestion, descriptionSuggestion, adminReviewNote. Listing package: ${JSON.stringify(body)}`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_LISTING_REVIEW_MODEL") || "gpt-4.1-mini",
        input: prompt,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "OpenAI review failed");

    const text = payload.output_text || payload.output?.[0]?.content?.[0]?.text;
    return jsonResponse({ ...JSON.parse(text), source: "openai" });
  } catch (error) {
    return jsonResponse({ ...localReview({}), source: "fallback", error: error.message }, 200);
  }
});
