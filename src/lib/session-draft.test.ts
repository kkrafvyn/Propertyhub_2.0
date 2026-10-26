import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readSessionDraft, writeSessionDraft, clearSessionDraft } from './session-draft';
beforeEach(() => sessionStorage.clear());
describe('private session draft recovery', () => {
  it('restores per-user drafts, clears sent text and expires stale drafts', () => {
    writeSessionDraft('user1:thread', 'Hello');
    expect(readSessionDraft('user1:thread')).toBe('Hello');
    expect(readSessionDraft('user2:thread')).toBeNull();
    clearSessionDraft('user1:thread'); expect(readSessionDraft('user1:thread')).toBeNull();
    writeSessionDraft('expired', 'Old'); vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
    expect(readSessionDraft('expired')).toBeNull(); vi.restoreAllMocks();
  });
  it('editing is safe when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => writeSessionDraft('thread', 'Keep editing')).not.toThrow(); vi.restoreAllMocks();
  });
});
