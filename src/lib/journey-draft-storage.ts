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

/** Active session drafts (listing id + kind) for resume banners. */
export function listActiveJourneyDrafts(): Array<{ listingId: string; kind: JourneyDraftKind }> {
  if (typeof window === "undefined") return [];
  const rows: Array<{ listingId: string; kind: JourneyDraftKind }> = [];
  const kinds: JourneyDraftKind[] = ["inquiry", "offer", "booking"];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith(PREFIX)) continue;
    const suffix = key.slice(PREFIX.length);
    const dot = suffix.lastIndexOf(".");
    if (dot <= 0) continue;
    const kind = suffix.slice(dot + 1) as JourneyDraftKind;
    if (!kinds.includes(kind)) continue;
    rows.push({ listingId: suffix.slice(0, dot), kind });
  }
  return rows;
}
