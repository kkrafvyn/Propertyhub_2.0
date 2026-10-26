const PREFIX = 'baytmiftah.session-draft.';
const TTL = 24 * 60 * 60 * 1000;
export function readSessionDraft<T>(key: string): T | null {
  try { const raw = sessionStorage.getItem(PREFIX + key); if (!raw) return null; const item = JSON.parse(raw); if (!item || typeof item.savedAt !== 'number' || Date.now() - item.savedAt > TTL) { sessionStorage.removeItem(PREFIX + key); return null; } return item.value as T; } catch { return null; }
}
export function writeSessionDraft(key: string, value: unknown) {
  try { sessionStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), value })); } catch { /* Quota/private mode must not interrupt editing. */ }
}
export function clearSessionDraft(key: string) { try { sessionStorage.removeItem(PREFIX + key); } catch { /* Storage is optional. */ } }

export function readTextSessionDraft(key: string): string {
  const value = readSessionDraft<unknown>(key);
  return typeof value === 'string' ? value : '';
}
