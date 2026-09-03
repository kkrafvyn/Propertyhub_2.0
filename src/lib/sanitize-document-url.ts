/** Allow only HTTPS document links on public signing surfaces. */
export function sanitizePublicDocumentUrl(url?: string | null): string | null {
  const value = String(url || "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
