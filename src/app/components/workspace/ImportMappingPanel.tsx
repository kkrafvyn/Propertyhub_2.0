import { Loader2, Sparkles } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import { ImportColumnMapper } from "./ImportColumnMapper";
import type { ImportExtractionResult } from "../../../lib/document-import";
import type { HeaderMappingResult, ImportTypeKey } from "../../../lib/import-column-mapping";

type Props = {
  importType: ImportTypeKey;
  extraction: ImportExtractionResult | null;
  rawHeaders: string[];
  headerResult: HeaderMappingResult | null;
  effectiveMapping: Record<string, number>;
  overrides: Record<string, number>;
  mappingComplete: boolean;
  mappingWarnings: string[];
  shouldOfferAi: boolean;
  busy: boolean;
  selectedSheet: string;
  sheetNames?: string[];
  onOverride: (field: string, columnIndex: number | undefined) => void;
  onSheetChange: (sheet: string) => void;
  onAiAssist: () => void;
};

export function ImportMappingPanel({
  importType,
  extraction,
  rawHeaders,
  headerResult,
  effectiveMapping,
  overrides,
  mappingComplete,
  mappingWarnings,
  shouldOfferAi,
  busy,
  selectedSheet,
  sheetNames,
  onOverride,
  onSheetChange,
  onAiAssist,
}: Props) {
  if (!extraction) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <Badge variant="outline">Source: {extraction.sourceFormat}</Badge>
        <Badge variant="secondary">Method: {extraction.method.replace(/_/g, " ")}</Badge>
        <Badge variant="outline">Confidence: {Math.round(extraction.confidence * 100)}%</Badge>
        {headerResult && (
          <Badge variant={mappingComplete ? "default" : "destructive"}>
            Mapping: {mappingComplete ? "Complete" : "Incomplete"}
          </Badge>
        )}
        {extraction.warnings.map((w) => (
          <span key={w} className="text-amber-600 dark:text-amber-400">
            {w}
          </span>
        ))}
        {mappingWarnings.map((w) => (
          <span key={w} className="text-amber-600 dark:text-amber-400">
            {w}
          </span>
        ))}
      </div>

      {!mappingComplete && (
        <p className="text-xs text-destructive font-medium">Map all required fields before import.</p>
      )}

      {sheetNames && sheetNames.length > 1 && (
        <label className="text-xs flex flex-col gap-1 max-w-xs">
          <span className="font-medium">Excel worksheet</span>
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5"
            value={selectedSheet}
            onChange={(e) => onSheetChange(e.target.value)}
            disabled={busy}
          >
            {sheetNames.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}

      {rawHeaders.length > 0 && (
        <ImportColumnMapper
          importType={importType}
          rawHeaders={rawHeaders}
          effectiveMapping={effectiveMapping}
          overrides={overrides}
          onOverride={onOverride}
        />
      )}

      {shouldOfferAi && (
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onAiAssist}>
          {busy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
          Improve mapping with AI
        </Button>
      )}
    </div>
  );
}
