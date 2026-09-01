import { downloadTextFile } from "./finance-report.service";
import { getChargeOutstandingMinor, type EstateChargeRow } from "./estate-ledger";

const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
export function buildEstateReceivablesCsv(charges: EstateChargeRow[], unitLabel: (unitId: string) => string) {
  const header = ["Unit", "Due date", "Type", "Description", "Charge", "Allocated", "Outstanding", "Currency"];
  const rows = charges.map((charge) => { const allocated = Number(charge.amount_minor) - getChargeOutstandingMinor(charge); return [unitLabel(charge.unit_id), charge.due_date, charge.type || "other", charge.description || "", Number(charge.amount_minor), allocated, getChargeOutstandingMinor(charge), charge.currency || "GHS"]; });
  return [header, ...rows].map(row => row.map(quote).join(",")).join("\n");
}
export function exportEstateReceivables(charges: EstateChargeRow[], unitLabel: (unitId: string) => string) { downloadTextFile(`baytmiftah-estate-receivables-${new Date().toISOString().slice(0,10)}.csv`, buildEstateReceivablesCsv(charges, unitLabel), "text/csv;charset=utf-8"); }
