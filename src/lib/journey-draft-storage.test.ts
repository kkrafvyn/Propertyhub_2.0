import { beforeEach, describe, expect, it } from 'vitest';
import { saveJourneyDraft, readJourneyDraft, clearJourneyDraft, listActiveJourneyDrafts } from './journey-draft-storage';
beforeEach(() => sessionStorage.clear());
describe('scoped enquiry recovery', () => {
  it('keeps authenticated drafts separate and claims guest drafts only once', () => {
    saveJourneyDraft('home', 'inquiry', { message: 'Private' }, 'alice');
    expect(readJourneyDraft('home', 'inquiry', 'bob')).toBeNull();
    expect(listActiveJourneyDrafts('alice')).toEqual([{ listingId: 'home', kind: 'inquiry' }]);
    saveJourneyDraft('home', 'offer', { amount: '100' });
    expect(readJourneyDraft('home', 'offer', 'alice')).toEqual({ amount: '100' });
    expect(readJourneyDraft('home', 'offer', 'bob')).toBeNull();
    clearJourneyDraft('home', 'inquiry', 'alice');
    expect(readJourneyDraft('home', 'inquiry', 'alice')).toBeNull();
  });
});
