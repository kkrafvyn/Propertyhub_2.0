import { readSessionDraft, writeSessionDraft, clearSessionDraft } from './session-draft';
export type JourneyDraftKind = 'inquiry' | 'offer' | 'booking';
const keyFor = (listingId: string, kind: JourneyDraftKind, owner = 'guest') => `journey:${owner}:${listingId}.${kind}`;
export function saveJourneyDraft(listingId: string, kind: JourneyDraftKind, payload: Record<string, unknown>, owner?: string) {
  writeSessionDraft(keyFor(listingId, kind, owner), payload);
}
export function readJourneyDraft<T extends Record<string, unknown>>(listingId: string, kind: JourneyDraftKind, owner?: string): T | null {
  const key = keyFor(listingId, kind, owner);
  let value = readSessionDraft<T>(key);
  // Claim an anonymous draft once after sign-in, without exposing another account's draft.
  if (!value && owner) {
    value = readSessionDraft<T>(keyFor(listingId, kind));
    if (value) { writeSessionDraft(key, value); clearSessionDraft(keyFor(listingId, kind)); }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
export function clearJourneyDraft(listingId: string, kind: JourneyDraftKind, owner?: string) {
  clearSessionDraft(keyFor(listingId, kind, owner));
}
export function listActiveJourneyDrafts(owner?: string): Array<{ listingId: string; kind: JourneyDraftKind }> {
  const prefix = `baytmiftah.session-draft.journey:${owner || 'guest'}:`;
  const rows: Array<{ listingId: string; kind: JourneyDraftKind }> = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i); if (!key?.startsWith(prefix)) continue;
      const suffix = key.slice(prefix.length); const dot = suffix.lastIndexOf('.');
      const kind = suffix.slice(dot + 1) as JourneyDraftKind; const listingId = suffix.slice(0, dot);
      if (dot > 0 && ['inquiry', 'offer', 'booking'].includes(kind) && readJourneyDraft(listingId, kind, owner)) rows.push({ listingId, kind });
    }
  } catch { return []; }
  return rows;
}
