/** Require explicitly recorded amenities; missing data never implies a feature. */
export function matchesMarketplaceAmenities(recorded: unknown, requested: string[] = []): boolean {
  if (!requested.length) return true;
  if (!Array.isArray(recorded)) return false;
  const available = new Set(recorded.filter((item): item is string => typeof item === "string").map((item) => item.trim().toLowerCase()));
  return requested.every((item) => available.has(item.trim().toLowerCase()));
}
