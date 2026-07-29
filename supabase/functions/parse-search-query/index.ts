import { corsHeaders, HttpError, jsonResponse } from "../_shared/http.ts";
import {
  type AiSource,
  chatCompletion,
  resolveAiProvider,
} from "../_shared/llm-provider.ts";

function parseSearchQueryLocally(query: string) {
  const filters: Record<string, unknown> = {};
  const lower = query.toLowerCase();

  const priceMatch = query.match(/(?:under|below|less than)\s+(\d+)/i);
  if (priceMatch) filters.priceMax = parseInt(priceMatch[1], 10);

  const priceRangeMatch = query.match(/(\d+).*to.*(\d+)/i);
  if (priceRangeMatch) {
    filters.priceMin = parseInt(priceRangeMatch[1], 10);
    filters.priceMax = parseInt(priceRangeMatch[2], 10);
  }

  const bedroomMatch = query.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  if (bedroomMatch) filters.bedrooms = parseInt(bedroomMatch[1], 10);

  const bathroomMatch = query.match(/(\d+)\s*(?:bath|bathroom)/i);
  if (bathroomMatch) filters.bathrooms = parseInt(bathroomMatch[1], 10);

  if (/(rent|rental|monthly)/i.test(query)) filters.listingType = "rental";
  if (/(lease|leasing)/i.test(query)) filters.listingType = "lease";
  if (/(buy|sale|purchase|own)/i.test(query)) filters.listingType = "sale";
  if (/(short stay|airbnb|nightly|weekend stay|vacation)/i.test(query)) {
    filters.listingType = "short_stay";
  }

  if (/(apartment|flat|condo)/i.test(query)) filters.propertyType = "apartment";
  if (/(house|home|villa|duplex)/i.test(query)) filters.propertyType = "house";
  if (/(office|workspace)/i.test(query)) filters.propertyType = "office";
  if (/(commercial|shop|retail)/i.test(query)) filters.propertyType = "commercial";
  if (/(land|plot)/i.test(query)) filters.propertyType = "land";

  const locations = ["legon", "osu", "cantonments", "accra", "kumasi", "tema", "east legon", "airport"];
  for (const loc of locations) {
    if (lower.includes(loc)) filters.location = loc;
  }

  return filters;
}

async function parseWithLlm(query: string) {
  const content = await chatCompletion({
    temperature: 0,
    responseFormat: "json_object",
    messages: [
      {
        role: "system",
        content:
          'Parse Ghana property search queries into JSON filters. Return only {"filters":{...}} with optional keys: priceMin, priceMax, bedrooms, bathrooms, listingType (rental|sale|lease|short_stay), propertyType (apartment|house|office|commercial|land), location.',
      },
      { role: "user", content: query },
    ],
  });

  if (!content) return null;

  const parsed = JSON.parse(content);
  if (parsed?.filters && typeof parsed.filters === "object") {
    return parsed.filters as Record<string, unknown>;
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const body = await req.json().catch(() => null);
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      throw new HttpError(400, "query is required");
    }

    let filters: Record<string, unknown> | null = null;
    let source: AiSource = "local";
    const activeProvider = resolveAiProvider();

    try {
      filters = await parseWithLlm(query);
      if (filters && activeProvider) source = activeProvider;
    } catch (error) {
      console.warn("LLM parse failed, falling back to local parser:", error);
    }

    if (!filters) {
      filters = parseSearchQueryLocally(query);
    }

    return jsonResponse(200, { filters, source, provider: activeProvider });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }

    console.error("parse-search-query error:", error);
    return jsonResponse(500, { error: "Unable to parse search query" });
  }
});
