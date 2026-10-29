/** Pseudonymous public unit code shown in explorer (no PII). */
export function formatPublicUnitId(listingId: string): string {
  return `BM-UNIT-${String(listingId).slice(-6).toUpperCase()}`;
}

export function parsePublicUnitListingSuffix(identifier: string): string | null {
  const match = /^BM-UNIT-([A-Z0-9]+)$/i.exec(identifier.trim());
  return match?.[1]?.toUpperCase() ?? null;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}
