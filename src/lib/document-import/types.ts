import type { ImportTypeKey } from "../import-column-mapping";

export type ExtractionMethod =
  | "spreadsheet"
  | "json"
  | "xml"
  | "docx_table"
  | "pdf_heuristic"
  | "ai_assisted";

export type ImportExtractionResult = {
  matrix: string[][];
  method: ExtractionMethod;
  confidence: number;
  warnings: string[];
  sheetNames?: string[];
  /** Raw text when PDF/heuristic path used (for AI fallback). */
  extractedText?: string;
  sourceFormat: string;
};

export type ReadImportDocumentOptions = {
  sheetName?: string;
  importType?: ImportTypeKey;
  /** Workbook buffer cache for multi-sheet re-read */
  spreadsheetBuffer?: ArrayBuffer;
};

export const IMPORT_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const IMPORT_FILE_ACCEPT =
  ".csv,.tsv,.txt,.json,.xml,.pdf,.docx,.xlsx,.xls,.xlsm,.ods," +
  "text/csv,text/tab-separated-values,application/json,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet";

export const IMPORT_FORMATS_LABEL =
  "CSV, Excel, JSON, XML, Word (.docx), PDF, TSV, or OpenDocument (.ods)";
