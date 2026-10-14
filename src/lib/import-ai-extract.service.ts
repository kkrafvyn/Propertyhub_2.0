import { supabase } from "./supabase";
import type { ImportTypeKey } from "./import-column-mapping";
import type { ImportExtractionResult } from "./document-import";

export type AiExtractSuccess = {
  skipped: false;
  matrix: string[][];
  confidence: number;
  warnings: string[];
  method: "ai_assisted";
  provider?: string | null;
};

export type AiExtractResponse = { skipped: true; reason: string } | AiExtractSuccess;

export function isAiExtractSuccess(response: AiExtractResponse): response is AiExtractSuccess {
  return response.skipped === false;
}

export async function requestAiImportExtract(input: {
  organizationId: string;
  importType: ImportTypeKey;
  fileName: string;
  extractedText?: string;
  matrixSample?: string[][];
}): Promise<AiExtractResponse> {
  const matrixSample = input.matrixSample?.slice(0, 25);
  const { data, error } = await supabase.functions.invoke("import-data-extract", {
    body: {
      organizationId: input.organizationId,
      importType: input.importType,
      fileName: input.fileName,
      extractedText: input.extractedText?.slice(0, 120_000),
      matrixSample,
    },
  });

  if (error) {
    throw new Error(error.message || "AI import extraction failed.");
  }

  if (data?.skipped) {
    return { skipped: true, reason: String(data.reason || "AI extraction unavailable.") };
  }

  return {
    skipped: false,
    matrix: (data?.matrix as string[][]) || [],
    confidence: Number(data?.confidence ?? 0.65),
    warnings: Array.isArray(data?.warnings) ? data.warnings : [],
    method: "ai_assisted",
    provider: data?.provider as string | null,
  };
}

export function aiResultToExtraction(
  ai: { matrix: string[][]; confidence: number; warnings: string[] },
  sourceFormat: string,
  extractedText?: string,
): ImportExtractionResult {
  return {
    matrix: ai.matrix,
    method: "ai_assisted",
    confidence: ai.confidence,
    warnings: ai.warnings,
    extractedText,
    sourceFormat,
  };
}
