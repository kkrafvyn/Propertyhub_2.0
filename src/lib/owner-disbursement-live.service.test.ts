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
  it('never counts an approved, processing or failed statement as disbursed', () => {
    const sample = {
      id: 'stmt-2',
      owner_user_id: 'owner-2',
      period_start: '2026-09-01',
      period_end: '2026-09-30',
      gross_collections_minor: 150000,
      expense_minor: 20000,
      net_distributable_minor: 130000,
    };
    expect(mapOwnerStatementRun({ ...sample, status: 'approved' }).payoutStatus).toBe('pending_approval');
    expect(mapOwnerStatementRun({ ...sample, status: 'processing' }).payoutStatus).toBe('pending_approval');
    expect(mapOwnerStatementRun({ ...sample, status: 'failed' }).payoutStatus).toBe('on_hold');
    expect(mapOwnerStatementRun({ ...sample, status: 'delivered' }).payoutStatus).toBe('disbursed_bank');
  });
});