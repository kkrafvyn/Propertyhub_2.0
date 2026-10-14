import { normalizeMatrix } from "./spreadsheet";

const ROW_TAGS = ["row", "record", "item", "entry", "transaction", "unit", "tenant", "payment"];

function localName(tag: string): string {
  const idx = tag.indexOf(":");
  return (idx >= 0 ? tag.slice(idx + 1) : tag).toLowerCase();
}

function childFieldMap(element: Element): Record<string, string> {
  const map: Record<string, string> = {};
  for (const child of Array.from(element.children)) {
    const key = localName(child.tagName);
    const value = (child.textContent || "").trim();
    if (value) map[key] = value;
  }
  if (Object.keys(map).length === 0) {
    for (const attr of Array.from(element.attributes)) {
      map[attr.name.toLowerCase()] = attr.value.trim();
    }
  }
  return map;
}

export function matrixFromXmlText(content: string): string[][] {
  const doc = new DOMParser().parseFromString(content, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid XML document.");
  }

  let rowElements: Element[] = [];
  for (const tag of ROW_TAGS) {
    const found = Array.from(doc.getElementsByTagName("*")).filter((el) => localName(el.tagName) === tag);
    if (found.length >= 2) {
      rowElements = found;
      break;
    }
  }

  if (rowElements.length === 0) {
    const root = doc.documentElement;
    const children = Array.from(root.children).filter((c) => c.children.length > 0 || c.textContent?.trim());
    if (children.length >= 2) rowElements = children;
  }

  if (rowElements.length === 0) return [];

  const records = rowElements.map(childFieldMap);
  const headerSet = new Set<string>();
  for (const row of records) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = Array.from(headerSet);
  const matrix: string[][] = [headers];
  for (const row of records) {
    matrix.push(headers.map((h) => row[h] ?? ""));
  }
  return normalizeMatrix(matrix);
}
