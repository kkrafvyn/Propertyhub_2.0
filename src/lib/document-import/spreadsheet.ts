import * as XLSX from "@e965/xlsx";
import { parseCsv } from "../csv-parse";
export function fileExtension(fileName: string): string {
  const base = fileName.trim().toLowerCase();
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1) : "";
}

export function normalizeMatrix(raw: unknown[][]): string[][] {
  return raw
    .map((row) => row.map((cell) => String(cell ?? "").trim()))
    .filter((row) => row.some((cell) => cell.length > 0));
}

const TEXT_EXTENSIONS = new Set(["csv", "tsv", "txt"]);
const SHEET_EXTENSIONS = new Set(["xlsx", "xls", "xlsm", "ods"]);

export function isSpreadsheetExtension(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext) || SHEET_EXTENSIONS.has(ext) || ext === "";
}

export function matrixFromTextContent(content: string, ext: string): string[][] {
  if (ext === "tsv" || ext === "txt") {
    const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
    const delimiter = ext === "tsv" ? "\t" : lines.some((l) => l.includes("\t")) ? "\t" : ",";
    if (delimiter === "\t") {
      return normalizeMatrix(lines.map((line) => line.split("\t")));
    }
  }
  return normalizeMatrix(parseCsv(content));
}

export function listWorkbookSheets(buffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(buffer, { type: "array", bookSheets: true });
  return workbook.SheetNames || [];
}

export function matrixFromSpreadsheetBuffer(buffer: ArrayBuffer, sheetName?: string): string[][] {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const name = sheetName && workbook.SheetNames.includes(sheetName) ? sheetName : workbook.SheetNames[0];
  if (!name) return [];
  const sheet = workbook.Sheets[name];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return normalizeMatrix(rows as unknown[][]);
}

export async function extractSpreadsheet(
  file: File,
  sheetName?: string,
): Promise<{ matrix: string[][]; sheetNames?: string[] }> {
  const ext = fileExtension(file.name);
  if (TEXT_EXTENSIONS.has(ext) || ext === "") {
    const content = await file.text();
    return { matrix: matrixFromTextContent(content, ext || "csv") };
  }
  if (SHEET_EXTENSIONS.has(ext)) {
    const buffer = await file.arrayBuffer();
    const sheetNames = listWorkbookSheets(buffer);
    return {
      matrix: matrixFromSpreadsheetBuffer(buffer, sheetName),
      sheetNames,
    };
  }
  throw new Error(`Not a spreadsheet: .${ext}`);
}
