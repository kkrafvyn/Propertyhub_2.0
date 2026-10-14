import { normalizeMatrix } from "./spreadsheet";

function matrixFromHtmlTable(html: string): string[][] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return [];

  const matrix: string[][] = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    const cells = Array.from(tr.querySelectorAll("th, td")).map((cell) => (cell.textContent || "").trim());
    if (cells.some((c) => c.length > 0)) matrix.push(cells);
  }
  return normalizeMatrix(matrix);
}

export async function matrixFromDocxBuffer(buffer: ArrayBuffer): Promise<string[][]> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const fromTable = matrixFromHtmlTable(result.value);
  if (fromTable.length >= 2) return fromTable;

  const textResult = await mammoth.extractRawText({ arrayBuffer: buffer });
  const lines = textResult.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    throw new Error("No table found in Word document. Use a table or export to Excel.");
  }
  const delimiter = lines.some((l) => l.includes("\t")) ? "\t" : lines.some((l) => l.includes("|")) ? "|" : ",";
  return normalizeMatrix(lines.map((line) => line.split(delimiter).map((c) => c.trim())));
}
