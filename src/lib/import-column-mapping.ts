import vendorSynonyms from "./import-column-synonyms.json";

export type ImportTypeKey =
  | "estates_units"
  | "occupancies"
  | "opening_charges"
  | "payments"
  | "bank_feed";

const BASE_SYNONYMS: Record<ImportTypeKey, Record<string, string[]>> = {
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

function mergeSynonymLists(base: string[], extra: string[] | undefined): string[] {
  if (!extra?.length) return base;
  return Array.from(new Set([...base, ...extra]));
}

function buildSynonyms(): Record<ImportTypeKey, Record<string, string[]>> {
  const out = { ...BASE_SYNONYMS } as Record<ImportTypeKey, Record<string, string[]>>;
  const vendor = vendorSynonyms as Record<string, Record<string, string[]>>;
  for (const importType of Object.keys(out) as ImportTypeKey[]) {
    const extra = vendor[importType];
    if (!extra) continue;
    for (const [field, lists] of Object.entries(extra)) {
      if (out[importType][field]) {
        out[importType][field] = mergeSynonymLists(out[importType][field], lists);
      }
    }
  }
  return out;
}

const SYNONYMS = buildSynonyms();

export function canonicalFieldsForImportType(importType: ImportTypeKey): string[] {
  return Object.keys(SYNONYMS[importType]);
}

export function requiredFields(importType: ImportTypeKey): string[] {
  const canonicals = canonicalFieldsForImportType(importType);
  if (importType === "estates_units") return canonicals.filter((c) => c === "estate_name" || c === "unit_identifier");
  if (importType === "occupancies")
    return canonicals.filter((c) =>
      ["estate_name", "unit_identifier", "user_email", "role", "start_date"].includes(c),
    );
  if (importType === "opening_charges")
    return canonicals.filter((c) => ["estate_name", "unit_identifier", "amount", "due_date"].includes(c));
  if (importType === "payments")
    return canonicals.filter((c) =>
      ["estate_name", "unit_identifier", "charge_id", "amount", "method"].includes(c),
    );
  if (importType === "bank_feed") return canonicals.filter((c) => ["date", "amount"].includes(c));
  return [];
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) row[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

function findColumnForCanonical(
  normalized: { raw: string; norm: string; index: number }[],
  options: string[],
): { index: number; fuzzy: boolean } | null {
  const exact = normalized.find((cell) => options.includes(cell.norm));
  if (exact) return { index: exact.index, fuzzy: false };

  for (const cell of normalized) {
    if (options.some((opt) => cell.norm.includes(opt) || opt.includes(cell.norm))) {
      return { index: cell.index, fuzzy: true };
    }
  }

  for (const cell of normalized) {
    if (options.some((opt) => levenshtein(cell.norm, opt) <= 2)) {
      return { index: cell.index, fuzzy: true };
    }
  }

  return null;
}

export type HeaderMappingResult = {
  mapping: Record<string, number>;
  missing: string[];
  confidence: number;
  fuzzyFields: string[];
};

export function mapHeaders(rawHeaders: string[], importType: ImportTypeKey): HeaderMappingResult {
  const synonyms = SYNONYMS[importType];
  const normalized = rawHeaders.map((h, index) => ({ raw: h, norm: normalizeHeader(h), index }));
  const mapping: Record<string, number> = {};
  const fuzzyFields: string[] = [];
  const canonicals = Object.keys(synonyms);

  for (const canonical of canonicals) {
    const options = synonyms[canonical].map(normalizeHeader);
    const hit = findColumnForCanonical(normalized, options);
    if (hit) {
      mapping[canonical] = hit.index;
      if (hit.fuzzy) fuzzyFields.push(canonical);
    }
  }

  const required = requiredFields(importType);
  const missing = required.filter((c) => mapping[c] === undefined);
  let confidence =
    required.length === 0 ? 1 : Number(((required.length - missing.length) / required.length).toFixed(2));
  if (fuzzyFields.length > 0) {
    confidence = Number(Math.max(0, confidence - 0.1 * fuzzyFields.length).toFixed(2));
  }

  return { mapping, missing, confidence, fuzzyFields };
}

export function mergeHeaderMapping(
  auto: Record<string, number>,
  overrides: Record<string, number>,
): Record<string, number> {
  return { ...auto, ...overrides };
}

export function duplicateMappingWarnings(mapping: Record<string, number>): string[] {
  const byIndex = new Map<number, string[]>();
  for (const [field, idx] of Object.entries(mapping)) {
    const list = byIndex.get(idx) || [];
    list.push(field);
    byIndex.set(idx, list);
  }
  const warnings: string[] = [];
  for (const [idx, fields] of byIndex) {
    if (fields.length > 1) {
      warnings.push(`Columns ${idx + 1} mapped to multiple fields: ${fields.join(", ")}`);
    }
  }
  return warnings;
}

/** True when first row is already canonical (e.g. AI output). */
export function matrixHasCanonicalHeaders(matrix: string[][], importType: ImportTypeKey): boolean {
  if (matrix.length === 0) return false;
  const headers = matrix[0].map((h) => normalizeHeader(h));
  const required = requiredFields(importType);
  return required.every((field) => headers.includes(normalizeHeader(field)));
}

export function buildMappedMatrix(
  rawMatrix: string[][],
  importType: ImportTypeKey,
  overrides: Record<string, number> = {},
): string[][] {
  if (rawMatrix.length === 0) return rawMatrix;

  if (matrixHasCanonicalHeaders(rawMatrix, importType)) {
    const required = requiredFields(importType);
    const optional = canonicalFieldsForImportType(importType).filter((f) => !required.includes(f));
    const headerOrder = [...required, ...optional.filter((f) => rawMatrix[0].includes(f))];
    const headerNorm = rawMatrix[0].map(normalizeHeader);
    const dataRows = rawMatrix.slice(1).map((row) =>
      headerOrder.map((field) => {
        const idx = headerNorm.indexOf(normalizeHeader(field));
        return idx >= 0 ? String(row[idx] ?? "").trim() : "";
      }),
    );
    return [headerOrder, ...dataRows];
  }

  const { mapping: auto } = mapHeaders(rawMatrix[0], importType);
  const effective = mergeHeaderMapping(auto, overrides);
  const canonicalOrder = canonicalFieldsForImportType(importType);
  const newHeader = canonicalOrder.filter((c) => effective[c] !== undefined);
  if (newHeader.length === 0) return rawMatrix;

  const dataRows = rawMatrix.slice(1).map((row) =>
    newHeader.map((canonical) => {
      const idx = effective[canonical];
      return idx !== undefined ? String(row[idx] ?? "").trim() : "";
    }),
  );
  return [newHeader, ...dataRows];
}

export function isMappingComplete(
  rawMatrix: string[][],
  importType: ImportTypeKey,
  overrides: Record<string, number> = {},
): boolean {
  if (rawMatrix.length === 0) return false;
  if (matrixHasCanonicalHeaders(rawMatrix, importType)) {
    return requiredFields(importType).every((f) =>
      rawMatrix[0].map(normalizeHeader).includes(normalizeHeader(f)),
    );
  }
  const { mapping: auto } = mapHeaders(rawMatrix[0], importType);
  const effective = mergeHeaderMapping(auto, overrides);
  return requiredFields(importType).every((f) => effective[f] !== undefined);
}

/** @deprecated Use buildMappedMatrix */
export function applyHeaderMapping(matrix: string[][], importType: ImportTypeKey): string[][] {
  return buildMappedMatrix(matrix, importType);
}

/** @deprecated Use buildMappedMatrix with overrides */
export function applyManualHeaderMapping(
  matrix: string[][],
  fieldToColumnIndex: Record<string, number>,
): string[][] {
  return buildMappedMatrix(matrix, "estates_units", fieldToColumnIndex);
}
