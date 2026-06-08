import { errorResponse, handleCors, jsonResponse } from "../_shared/cors.ts";

const fallbackLocations: Record<string, { lat: number; lng: number }> = {
  accra: { lat: 5.6037, lng: -0.1870 },
  cantonments: { lat: 5.5849, lng: -0.1711 },
  "airport": { lat: 5.6052, lng: -0.1668 },
};

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "geocode";
    const query = url.searchParams.get("q") || url.searchParams.get("query") || "";
    if (req.method !== "GET" || action !== "geocode") return errorResponse("Method not allowed", 405);

    const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (mapboxToken && query) {
      const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=5`;
      const response = await fetch(endpoint);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Mapbox geocode failed");
      return jsonResponse({
        source: "mapbox",
        results: (payload.features || []).map((feature: any) => ({
          label: feature.place_name,
          lng: feature.center?.[0],
          lat: feature.center?.[1],
          bbox: feature.bbox || null,
        })),
      });
    }

    const key = query.toLowerCase();
    const matched = Object.entries(fallbackLocations).find(([name]) => key.includes(name));
    return jsonResponse({
      source: "fallback",
      results: matched
        ? [{ label: query || matched[0], ...matched[1] }]
        : [{ label: query || "Accra", ...fallbackLocations.accra }],
    });
  } catch (error) {
    return errorResponse(error.message || "Geocoding failed", 400);
  }
});
