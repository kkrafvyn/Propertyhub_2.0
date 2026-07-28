const CACHE_KEY = "baytmiftah:mobile-listings-cache";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

type CachedListingsPayload = {
  savedAt: string;
  listings: unknown[];
};

export function readCachedMobileListings(): unknown[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as CachedListingsPayload;
    if (!parsed?.savedAt || !Array.isArray(parsed.listings)) return [];

    const age = Date.now() - new Date(parsed.savedAt).getTime();
    if (Number.isNaN(age) || age > CACHE_TTL_MS) return [];

    return parsed.listings;
  } catch {
    return [];
  }
}

export function writeCachedMobileListings(listings: unknown[]) {
  if (typeof window === "undefined" || listings.length === 0) return;

  const payload: CachedListingsPayload = {
    savedAt: new Date().toISOString(),
    listings: listings.slice(0, 24),
  };

  window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}
