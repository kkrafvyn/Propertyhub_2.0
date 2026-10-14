import { applyHeaderMapping, type ImportTypeKey, mapHeaders } from "./import-column-mapping";
import { readImportDocument, type ImportExtractionResult } from "./document-import";

export async function extractMappedMatrix(
  file: File,
  importType: ImportTypeKey,
  sheetName?: string,
): Promise<{ extraction: ImportExtractionResult; matrix: string[][] }> {
  const extraction = await readImportDocument(file, { importType, sheetName });
  const matrix = applyHeaderMapping(extraction.matrix, importType);
  return { extraction, matrix };
}

export const AI_EXTRACT_CONFIDENCE_THRESHOLD = 0.55;

export function prepareMatrixForImport(
  extraction: ImportExtractionResult,
  importType: ImportTypeKey,
): { matrix: string[][]; headerMapping: ReturnType<typeof mapHeaders> } {
  const raw = extraction.matrix;
  if (raw.length === 0) {
    return { matrix: raw, headerMapping: mapHeaders([], importType) };
  }
  const headerMapping = mapHeaders(raw[0], importType);
  const matrix = applyHeaderMapping(raw, importType);
  return { matrix, headerMapping };
}

export function shouldOfferAiAssist(extraction: ImportExtractionResult): boolean {
  if (extraction.method === "ai_assisted") return false;
  if (extraction.confidence < AI_EXTRACT_CONFIDENCE_THRESHOLD) return true;
  if (extraction.matrix.length < 2) return true;
  if (extraction.sourceFormat === "pdf" && (extraction.extractedText?.length || 0) < 80) return true;
  return false;
}
