const STORAGE_KEY = "baytmiftah_compare_ids";
const MAX_COMPARE = 4;

export function getCompareIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function syncCompareIds(): Promise<string[]> {
  return Promise.resolve(getCompareIds());
}

export async function toggleCompareIdAsync(
  listingId: string,
): Promise<{ ids: string[]; capped: boolean }> {
  const ids = getCompareIds();
  const index = ids.indexOf(listingId);

  if (index >= 0) {
    ids.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    return { ids, capped: false };
  }

  if (ids.length >= MAX_COMPARE) {
    return { ids, capped: true };
  }

  ids.push(listingId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  return { ids, capped: false };
}

export const MAX_COMPARE_LISTINGS = MAX_COMPARE;
