/** RFC 4180-style CSV parsing (quoted fields, commas, CRLF, UTF-8 BOM). */
export function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (char === "\r") {
      row.push(field);
      field = "";
      if (text[i + 1] === "\n") i += 1;
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      i += 1;
      continue;
    }

    if (char === "\n") {
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  row.push(field);
  if (row.length > 1 || row[0] !== "") rows.push(row);

  return rows;
}

export function csvHeaderMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((header, index) => {
    map[header.trim().toLowerCase()] = index;
  });
  return map;
}

export function csvCell(row: string[], map: Record<string, number>, key: string): string {
  const index = map[key];
  if (index === undefined) return "";
  return row[index]?.trim() ?? "";
}
