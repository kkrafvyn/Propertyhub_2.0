export type ImportTypeKey =
  | "estates_units"
  | "occupancies"
  | "opening_charges"
  | "payments"
  | "bank_feed";

const SYNONYMS: Record<ImportTypeKey, Record<string, string[]>> = {
  estates_units: {
    estate_name: ["estate_name", "estate", "property", "property_name", "building", "community", "site"],
    unit_identifier: ["unit_identifier", "unit", "unit_id", "unit_number", "apt", "apartment", "suite", "door"],
    block: ["block", "building_block", "tower", "wing"],
    floor: ["floor", "level", "storey", "story"],
  },
  occupancies: {
    estate_name: ["estate_name", "estate", "property", "property_name", "building"],
    unit_identifier: ["unit_identifier", "unit", "unit_number", "apt", "suite"],
    user_email: ["user_email", "email", "tenant_email", "occupant_email", "contact_email"],
    role: ["role", "occupancy_role", "tenant_type", "relationship"],
    start_date: ["start_date", "move_in", "move_in_date", "lease_start", "commencement", "start"],
  },
  opening_charges: {
    estate_name: ["estate_name", "estate", "property"],
    unit_identifier: ["unit_identifier", "unit", "unit_number"],
    amount: ["amount", "balance", "arrears", "opening_balance", "total_due"],
    due_date: ["due_date", "date", "as_of", "as_of_date"],
    charge_type: ["charge_type", "type", "category", "fee_type"],
    description: ["description", "memo", "notes", "narration"],
  },
  payments: {
    estate_name: ["estate_name", "estate", "property"],
    unit_identifier: ["unit_identifier", "unit", "unit_number"],
    charge_id: ["charge_id", "invoice_id", "charge", "reference_id"],
    amount: ["amount", "payment", "paid", "value"],
    method: ["method", "payment_method", "channel", "type"],
    reference: ["reference", "provider_reference", "txn_ref", "transaction_id", "receipt"],
  },
  bank_feed: {
    date: ["date", "transaction_date", "posted_date", "value_date"],
    description: ["description", "narration", "details", "memo", "particulars"],
    amount: ["amount", "value", "debit", "credit", "transaction_amount"],
    type: ["type", "direction", "dr_cr", "debit_credit"],
    reference: ["reference", "bank_reference", "ref", "cheque_no"],
  },
};

export function canonicalFieldsForImportType(importType: ImportTypeKey): string[] {
  return Object.keys(SYNONYMS[importType]);
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export type HeaderMappingResult = {
  /** canonical field → column index in raw header row */
  mapping: Record<string, number>;
  /** canonical fields still unmapped */
  missing: string[];
  /** score 0–1 */
  confidence: number;
};

export function mapHeaders(rawHeaders: string[], importType: ImportTypeKey): HeaderMappingResult {
  const synonyms = SYNONYMS[importType];
  const normalized = rawHeaders.map((h, index) => ({ raw: h, norm: normalizeHeader(h), index }));
  const mapping: Record<string, number> = {};
  const canonicals = Object.keys(synonyms);

  for (const canonical of canonicals) {
    const options = synonyms[canonical].map(normalizeHeader);
    const hit = normalized.find((cell) => options.includes(cell.norm));
    if (hit) mapping[canonical] = hit.index;
  }

  const required = canonicals.filter((c) => {
    if (importType === "estates_units") return c === "estate_name" || c === "unit_identifier";
    if (importType === "occupancies")
      return ["estate_name", "unit_identifier", "user_email", "role", "start_date"].includes(c);
    if (importType === "opening_charges")
      return ["estate_name", "unit_identifier", "amount", "due_date"].includes(c);
    if (importType === "payments")
      return ["estate_name", "unit_identifier", "charge_id", "amount", "method"].includes(c);
    if (importType === "bank_feed") return ["date", "amount"].includes(c);
    return false;
  });

  const missing = required.filter((c) => mapping[c] === undefined);
  const confidence =
    required.length === 0 ? 1 : Number(((required.length - missing.length) / required.length).toFixed(2));

  return { mapping, missing, confidence };
}

/** Rewrite matrix header row to canonical names expected by parsers. */
export function applyHeaderMapping(matrix: string[][], importType: ImportTypeKey): string[][] {
  if (matrix.length === 0) return matrix;
  const { mapping } = mapHeaders(matrix[0], importType);
  const canonicalOrder = canonicalFieldsForImportType(importType);
  const newHeader = canonicalOrder.filter((c) => mapping[c] !== undefined);
  if (newHeader.length === 0) return matrix;

  const dataRows = matrix.slice(1).map((row) =>
    newHeader.map((canonical) => {
      const idx = mapping[canonical];
      return idx !== undefined ? String(row[idx] ?? "").trim() : "";
    }),
  );
  return [newHeader, ...dataRows];
}

/** User-selected column indices keyed by canonical field name. */
export function applyManualHeaderMapping(
  matrix: string[][],
  fieldToColumnIndex: Record<string, number>,
): string[][] {
  const fields = Object.keys(fieldToColumnIndex);
  if (fields.length === 0 || matrix.length === 0) return matrix;
  const header = fields;
  const dataRows = matrix.slice(1).map((row) =>
    fields.map((field) => {
      const idx = fieldToColumnIndex[field];
      return idx !== undefined ? String(row[idx] ?? "").trim() : "";
    }),
  );
  return [header, ...dataRows];
}
