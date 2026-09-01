export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

let lastRequestAt = 0;

export const openStreetMapService = {
  async geocodeAddress(address: string, city: string, region: string, country = "Ghana"): Promise<GeocodingResult | null> {
    const query = [address, city, region, country].filter(Boolean).join(", ").trim();
    if (!query) return null;

    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < 1000) {
      await new Promise((resolve) => window.setTimeout(resolve, 1000 - elapsed));
    }
    lastRequestAt = Date.now();

    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1",
      addressdetails: "1",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`OpenStreetMap geocoding failed (${response.status})`);

    const results = (await response.json()) as Array<{ display_name?: string; lat?: string; lon?: string }>;
    const result = results[0];
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);
    if (!result || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      displayName: result.display_name || query,
      latitude,
      longitude,
    };
  },
};
