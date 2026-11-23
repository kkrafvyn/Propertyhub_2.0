/**
 * Accept a real, published Matterport 3D scan, never arbitrary iframe HTML/URLs.
 * Canonicalization deliberately strips marketing/tracking query parameters.
 */
export function normalizeMatterportTourUrl(raw?: string | null): string | null {
  if (!raw?.trim() || raw.length > 2048) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" || url.hostname !== "my.matterport.com" ||
        url.port || url.username || url.password || url.pathname.replace(/\/$/, "") !== "/show") {
      return null;
    }
    const modelIds = url.searchParams.getAll("m");
    if (modelIds.length !== 1 || !/^[a-zA-Z0-9]{11}$/.test(modelIds[0])) return null;
    return `https://my.matterport.com/show/?m=${modelIds[0]}`;
  } catch {
    return null;
  }
}
