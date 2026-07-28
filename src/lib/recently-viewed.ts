const STORAGE_KEY = "baytmiftah:recently-viewed";
const MAX_ITEMS = 12;

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function trackRecentlyViewed(listingId: string) {
  if (typeof window === "undefined" || !listingId) return;

  const next = [listingId, ...getRecentlyViewedIds().filter((id) => id !== listingId)].slice(
    0,
    MAX_ITEMS
  );
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearRecentlyViewed() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
