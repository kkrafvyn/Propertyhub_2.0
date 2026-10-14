import { readImportDocument } from "./document-import";

export { fileExtension } from "./document-import/spreadsheet";

/** @deprecated Prefer readImportDocument from `./document-import`. */
export const IMPORT_FILE_ACCEPT =
  ".csv,.tsv,.txt,.json,.xml,.pdf,.docx,.xlsx,.xls,.xlsm,.ods," +
  "text/csv,text/tab-separated-values,application/json,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet";

export const IMPORT_FORMATS_LABEL =
  "CSV, Excel, JSON, XML, Word (.docx), PDF, TSV, or OpenDocument (.ods)";

/** Parse an uploaded file into a header row + data rows (first worksheet). */
export async function readImportFileAsMatrix(file: File): Promise<string[][]> {
  const result = await readImportDocument(file);
  return result.matrix;
}

export { importFileErrorMessage } from "./document-import";
