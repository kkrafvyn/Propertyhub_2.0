import { describe, expect, it } from 'vitest';
import { rankBankPaymentCandidates } from './bank-reconciliation.service';

describe('bank feed reconciliation contract', () => {
  it('keeps provider transaction matching deterministic when references tie', () => {
    const result = rankBankPaymentCandidates(
      { amount_minor: 2500, transaction_date: '2026-08-26', bank_reference: undefined },
      [
        { id: 'later', amount_minor: 2500, received_at: '2026-08-26' },
        { id: 'earlier', amount_minor: 2500, received_at: '2026-08-25' },
      ]
    );
    expect(result?.id).toBe('later');
  });
});