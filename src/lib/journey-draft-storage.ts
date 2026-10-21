const PREFIX = "baytmiftah.journey.draft.";

export type JourneyDraftKind = "inquiry" | "offer" | "booking";

export function saveJourneyDraft(listingId: string, kind: JourneyDraftKind, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PREFIX}${listingId}.${kind}`, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

export function readJourneyDraft<T extends Record<string, unknown>>(
  listingId: string,
  kind: JourneyDraftKind,
): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${listingId}.${kind}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearJourneyDraft(listingId: string, kind: JourneyDraftKind) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`${PREFIX}${listingId}.${kind}`);
}
