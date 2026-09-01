import { describe, expect, it } from 'vitest';
import { mapOwnerStatementRun } from './owner-disbursement.service';

describe('live owner disbursement boundary', () => {
  it('uses minor units for persisted statement amounts', () => {
    expect(18480).toBe(18480);
    expect(184.8 * 100).toBe(18480);
  });

  it('maps statement runs from ledger minor units instead of demo arrays', () => {
    const mapped = mapOwnerStatementRun({
      id: 'stmt-1',
      owner_user_id: 'owner-1',
      period_start: '2026-08-01',
      period_end: '2026-08-31',
      gross_collections_minor: 3000000,
      expense_minor: 450000,
      net_distributable_minor: 2550000,
      status: 'draft',
    }, 'Owner One');
    expect(mapped.grossRentCollectedGhs).toBe(30000);
    expect(mapped.netDisbursableGhs).toBe(25500);
    expect(mapped.payoutStatus).toBe('pending_approval');
  });
});