import { useCallback, useMemo, useState } from "react";
import type { ImportExtractionResult } from "./document-import";
import { readImportDocument, readSpreadsheetSheet } from "./document-import";
import {
  buildMappedMatrix,
  duplicateMappingWarnings,
  isMappingComplete,
  mapHeaders,
  mergeHeaderMapping,
  type ImportTypeKey,
} from "./import-column-mapping";
import { aiResultToExtraction, isAiExtractSuccess, requestAiImportExtract } from "./import-ai-extract.service";
import { shouldOfferAiAssist } from "./import-pipeline";

export function useImportMapping(importType: ImportTypeKey) {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [extraction, setExtraction] = useState<ImportExtractionResult | null>(null);
  const [rawMatrix, setRawMatrix] = useState<string[][]>([]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [selectedSheet, setSelectedSheet] = useState("");
  const [busy, setBusy] = useState(false);

  const headerResult = useMemo(
    () => (rawMatrix.length ? mapHeaders(rawMatrix[0], importType) : null),
    [rawMatrix, importType],
  );

  const effectiveMapping = useMemo(() => {
    if (!headerResult) return {};
    return mergeHeaderMapping(headerResult.mapping, overrides);
  }, [headerResult, overrides]);

  const mappedMatrix = useMemo(
    () => buildMappedMatrix(rawMatrix, importType, overrides),
    [rawMatrix, importType, overrides],
  );

  const mappingComplete = useMemo(
    () => isMappingComplete(rawMatrix, importType, overrides),
    [rawMatrix, importType, overrides],
  );

  const mappingWarnings = useMemo(() => duplicateMappingWarnings(effectiveMapping), [effectiveMapping]);

  const shouldOfferAi = extraction ? shouldOfferAiAssist(extraction) : false;

  const applyExtraction = useCallback((result: ImportExtractionResult, clearOverrides = true) => {
    setExtraction(result);
    setRawMatrix(result.matrix);
    if (clearOverrides) setOverrides({});
    if (result.sheetNames?.length) {
      setSelectedSheet((current) => current || result.sheetNames![0] || "");
    }
  }, []);

  const loadFile = useCallback(
    async (next: File, sheetName?: string) => {
      setFile(next);
      setFileName(next.name);
      setBusy(true);
      try {
        const result = sheetName
          ? await readSpreadsheetSheet(next, sheetName, importType)
          : await readImportDocument(next, { importType, sheetName });
        applyExtraction(result);
        return result;
      } finally {
        setBusy(false);
      }
    },
    [importType, applyExtraction],
  );

  const reloadSheet = useCallback(
    async (sheetName: string) => {
      if (!file) return;
      setSelectedSheet(sheetName);
      await loadFile(file, sheetName);
    },
    [file, loadFile],
  );

  const setOverride = useCallback((field: string, columnIndex: number | undefined) => {
    setOverrides((current) => {
      const next = { ...current };
      if (columnIndex === undefined) delete next[field];
      else next[field] = columnIndex;
      return next;
    });
  }, []);

  const runAiAssist = useCallback(
    async (organizationId: string) => {
      if (!extraction) return { ok: false as const, reason: "No file loaded." };
      setBusy(true);
      try {
        const ai = await requestAiImportExtract({
          organizationId,
          importType,
          fileName: fileName || "import",
          extractedText: extraction.extractedText,
          matrixSample: rawMatrix.length ? rawMatrix.slice(0, 30) : extraction.matrix.slice(0, 30),
        });
        if (!isAiExtractSuccess(ai)) {
          return { ok: false as const, reason: ai.reason };
        }
        applyExtraction(aiResultToExtraction(ai, extraction.sourceFormat, extraction.extractedText));
        return { ok: true as const };
      } finally {
        setBusy(false);
      }
    },
    [extraction, importType, fileName, rawMatrix, applyExtraction],
  );

  const reset = useCallback(() => {
    setFile(null);
    setFileName("");
    setExtraction(null);
    setRawMatrix([]);
    setOverrides({});
    setSelectedSheet("");
  }, []);

  return {
    file,
    fileName,
    extraction,
    rawMatrix,
    overrides,
    setOverrides,
    selectedSheet,
    headerResult,
    effectiveMapping,
    mappedMatrix,
    mappingComplete,
    mappingWarnings,
    shouldOfferAi,
    busy,
    loadFile,
    reloadSheet,
    setOverride,
    runAiAssist,
    reset,
  };
}
