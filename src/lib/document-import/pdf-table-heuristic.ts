import type { ImportTypeKey } from "../import-column-mapping";
import { mapHeaders as mapImportHeaders } from "../import-column-mapping";
import { normalizeMatrix as norm } from "./spreadsheet";

function splitLineToCells(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  if (/\s{2,}/.test(line)) return line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
  if (line.includes("|")) return line.split("|").map((c) => c.trim());
  if (line.includes(",")) return line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  return [line.trim()];
}

export function matrixFromPdfText(text: string, importType: ImportTypeKey = "bank_feed"): {
  matrix: string[][];
  confidence: number;
  warnings: string[];
} {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { matrix: [], confidence: 0.1, warnings: ["Too few lines in PDF text."] };
  }

  let best: { matrix: string[][]; score: number; headerIdx: number } | null = null;

  for (let headerIdx = 0; headerIdx < Math.min(8, lines.length - 1); headerIdx += 1) {
    const headerCells = splitLineToCells(lines[headerIdx]);
    if (headerCells.length < 2) continue;
    const { confidence, missing } = mapImportHeaders(headerCells, importType);
    const dataRows = lines.slice(headerIdx + 1, headerIdx + 201).map(splitLineToCells);
    const validRows = dataRows.filter((row) => row.length >= 2 && row.some((c) => c.length > 0));
    if (validRows.length === 0) continue;
    const width = headerCells.length;
    const normalizedRows = validRows.map((row) => {
      const copy = [...row];
      while (copy.length < width) copy.push("");
      return copy.slice(0, width);
    });
    const matrix = norm([headerCells, ...normalizedRows]);
    const score = confidence * 0.7 + Math.min(0.3, validRows.length / 50);
    if (!best || score > best.score) {
      best = { matrix, score, headerIdx };
    }
    if (missing.length === 0 && validRows.length >= 3) break;
  }

  if (!best || best.matrix.length < 2) {
    warnings.push("Could not detect a table in PDF text.");
    return { matrix: [], confidence: 0.2, warnings };
  }

  if (best.headerIdx > 0) {
    warnings.push(`Used line ${best.headerIdx + 1} as column headers.`);
  }

  return {
    matrix: best.matrix,
    confidence: Number(Math.min(0.85, best.score).toFixed(2)),
    warnings,
  };
}

// fix import - I wrongly imported mapHeaders from spreadsheet in pdf-table-heuristic - remove that
