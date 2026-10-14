import { fileExtension } from "./spreadsheet";
import { extractPdfPlainText } from "../document-text/pdf-text";
import { mapHeaders, type ImportTypeKey } from "../import-column-mapping";
import { matrixFromDocxBuffer } from "./docx-extract";
import { matrixFromJsonText } from "./json-extract";
import { matrixFromXmlText } from "./xml-extract";
import { matrixFromPdfText } from "./pdf-table-heuristic";
import { extractSpreadsheet, isSpreadsheetExtension } from "./spreadsheet";
import type { ImportExtractionResult, ReadImportDocumentOptions } from "./types";
import { IMPORT_DOCUMENT_MAX_BYTES } from "./types";

export type { ImportExtractionResult, ReadImportDocumentOptions };
export {
  IMPORT_FILE_ACCEPT,
  IMPORT_FORMATS_LABEL,
  IMPORT_DOCUMENT_MAX_BYTES,
} from "./types";
export { listWorkbookSheets, matrixFromSpreadsheetBuffer } from "./spreadsheet";

function scoreMatrix(matrix: string[][], headerConfidence: number): number {
  const dataRows = Math.max(0, matrix.length - 1);
  if (dataRows === 0) return 0.1;
  const rowScore = Math.min(0.35, dataRows / 40);
  return Number(Math.min(0.98, 0.45 + headerConfidence * 0.35 + rowScore).toFixed(2));
}

export async function readImportDocument(
  file: File,
  options: ReadImportDocumentOptions = {},
): Promise<ImportExtractionResult> {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > IMPORT_DOCUMENT_MAX_BYTES) {
    throw new Error("File exceeds the 10 MB import limit.");
  }

  const ext = fileExtension(file.name);
  const importType = options.importType ?? "estates_units";

  if (isSpreadsheetExtension(ext)) {
    const { matrix, sheetNames } = await extractSpreadsheet(file, options.sheetName);
    const { confidence: headerConf } = mapHeaders(matrix[0] || [], importType);
    return {
      matrix,
      method: "spreadsheet",
      confidence: scoreMatrix(matrix, headerConf),
      warnings: sheetNames && sheetNames.length > 1 && !options.sheetName
        ? [`Workbook has ${sheetNames.length} sheets. Using "${sheetNames[0]}".`]
        : [],
      sheetNames,
      sourceFormat: ext || "csv",
    };
  }

  if (ext === "json") {
    const matrix = matrixFromJsonText(await file.text());
    const { confidence: headerConf } = mapHeaders(matrix[0] || [], importType);
    return {
      matrix,
      method: "json",
      confidence: scoreMatrix(matrix, headerConf),
      warnings: [],
      sourceFormat: "json",
    };
  }

  if (ext === "xml") {
    const matrix = matrixFromXmlText(await file.text());
    const { confidence: headerConf } = mapHeaders(matrix[0] || [], importType);
    return {
      matrix,
      method: "xml",
      confidence: scoreMatrix(matrix, headerConf),
      warnings: [],
      sourceFormat: "xml",
    };
  }

  if (ext === "docx") {
    const matrix = await matrixFromDocxBuffer(await file.arrayBuffer());
    const { confidence: headerConf } = mapHeaders(matrix[0] || [], importType);
    return {
      matrix,
      method: "docx_table",
      confidence: scoreMatrix(matrix, headerConf),
      warnings: matrix.length < 2 ? ["Word document had limited tabular content."] : [],
      sourceFormat: "docx",
    };
  }

  if (ext === "pdf") {
    const bytes = await file.arrayBuffer();
    const { text } = await extractPdfPlainText(bytes, () => {}, {
      maxPages: 50,
      maxCharacters: 200_000,
      strictPages: false,
    });
    const pdfProfile = importType === "bank_feed" ? "bank_feed" : importType;
    const { matrix, confidence, warnings } = matrixFromPdfText(text, pdfProfile);
    return {
      matrix,
      method: "pdf_heuristic",
      confidence,
      warnings,
      extractedText: text,
      sourceFormat: "pdf",
    };
  }

  throw new Error(
    `Unsupported file type ".${ext}". Use CSV, Excel, JSON, XML, Word, or PDF.`,
  );
}

export function importFileErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not read this file.";
}

/** Re-read spreadsheet when user picks another worksheet. */
export async function readSpreadsheetSheet(
  file: File,
  sheetName: string,
  importType: ImportTypeKey = "estates_units",
): Promise<ImportExtractionResult> {
  return readImportDocument(file, { sheetName, importType });
}
