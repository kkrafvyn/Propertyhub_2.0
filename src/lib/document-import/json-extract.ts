import { normalizeMatrix } from "./spreadsheet";

const RECORD_KEYS = ["rows", "units", "data", "records", "items", "tenants", "payments", "transactions"];

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function recordsFromJson(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of RECORD_KEYS) {
      const nested = obj[key];
      if (Array.isArray(nested)) {
        return nested.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
      }
    }
    return [obj];
  }
  return [];
}

export function matrixFromJsonText(content: string): string[][] {
  const parsed = JSON.parse(content) as unknown;
  const records = recordsFromJson(parsed);
  if (records.length === 0) return [];

  const headerSet = new Set<string>();
  for (const row of records) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = Array.from(headerSet);
  const matrix: string[][] = [headers];
  for (const row of records) {
    matrix.push(headers.map((h) => flattenValue(row[h])));
  }
  return normalizeMatrix(matrix);
}
