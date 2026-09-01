export type EstateChargeRow = {
  id: string;
  unit_id: string;
  amount_minor: number | string;
  due_date: string;
  currency?: string;
  type?: string;
  description?: string | null;
  payment_allocations?: Array<{ amount_minor: number | string }> | null;
};

export type EstateLedgerSummary = {
  totalOutstandingMinor: number;
  overdueMinor: number;
  aging: { current: number; days1To30: number; days31To60: number; days61To90: number; days90Plus: number };
  outstandingByUnit: Map<string, number>;
};

const toMinor = (value: number | string | null | undefined) => Number(value || 0);

export function getChargeOutstandingMinor(charge: EstateChargeRow) {
  return toMinor(charge.amount_minor) - (charge.payment_allocations || []).reduce(
    (total, allocation) => total + toMinor(allocation.amount_minor),
    0,
  );
}

export function allocateOldestFirst(charges: EstateChargeRow[], paymentMinor: number) {
  let remaining = paymentMinor;
  const allocations: Array<{ charge_id: string; amount_minor: number }> = [];

  for (const charge of [...charges].sort((left, right) => left.due_date.localeCompare(right.due_date))) {
    if (remaining <= 0) break;
    const outstanding = getChargeOutstandingMinor(charge);
    if (outstanding <= 0) continue;
    const amount = Math.min(outstanding, remaining);
    allocations.push({ charge_id: charge.id, amount_minor: amount });
    remaining -= amount;
  }

  return { allocations, unallocatedMinor: remaining };
}

export function summarizeEstateLedger(charges: EstateChargeRow[], asOf = new Date()): EstateLedgerSummary {
  const startOfToday = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  const summary: EstateLedgerSummary = {
    totalOutstandingMinor: 0,
    overdueMinor: 0,
    aging: { current: 0, days1To30: 0, days31To60: 0, days61To90: 0, days90Plus: 0 },
    outstandingByUnit: new Map(),
  };

  for (const charge of charges) {
    const outstanding = getChargeOutstandingMinor(charge);
    if (outstanding <= 0) continue;
    summary.totalOutstandingMinor += outstanding;
    summary.outstandingByUnit.set(charge.unit_id, (summary.outstandingByUnit.get(charge.unit_id) || 0) + outstanding);

    const dueDate = new Date(`${charge.due_date}T00:00:00`);
    const overdueDays = Math.floor((startOfToday.getTime() - dueDate.getTime()) / 86_400_000);
    if (overdueDays <= 0) {
      summary.aging.current += outstanding;
    } else if (overdueDays <= 30) {
      summary.overdueMinor += outstanding;
      summary.aging.days1To30 += outstanding;
    } else if (overdueDays <= 60) {
      summary.overdueMinor += outstanding;
      summary.aging.days31To60 += outstanding;
    } else if (overdueDays <= 90) {
      summary.overdueMinor += outstanding;
      summary.aging.days61To90 += outstanding;
    } else {
      summary.overdueMinor += outstanding;
      summary.aging.days90Plus += outstanding;
    }
  }

  return summary;
}
