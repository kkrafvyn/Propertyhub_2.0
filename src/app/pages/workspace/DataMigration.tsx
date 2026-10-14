import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileUp, History, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { ImportColumnMapper } from "../../components/workspace/ImportColumnMapper";
import {
  estateImportService,
  parseEstateUnitsTable,
  parseOccupanciesTable,
  type ImportRow,
  type OccupancyImportRow,
} from "../../../lib/estate-import.service";
import { importJobStatusVariant } from "../../../lib/import-job-status";
import {
  IMPORT_FILE_ACCEPT,
  IMPORT_FORMATS_LABEL,
  importFileErrorMessage,
  readImportDocument,
  readSpreadsheetSheet,
  type ImportExtractionResult,
} from "../../../lib/document-import";
import {
  applyHeaderMapping,
  applyManualHeaderMapping,
  mapHeaders,
} from "../../../lib/import-column-mapping";
import {
  aiResultToExtraction,
  isAiExtractSuccess,
  requestAiImportExtract,
} from "../../../lib/import-ai-extract.service";
import { shouldOfferAiAssist } from "../../../lib/import-pipeline";

interface DataMigrationProps {
  organizationId: string;
  currentUserId: string;
}

export function DataMigration({ organizationId, currentUserId }: DataMigrationProps) {
  const [rows, setRows] = useState<Array<ImportRow | OccupancyImportRow>>([]);
  const [type, setType] = useState<"estates_units" | "occupancies">("estates_units");
  const [name, setName] = useState("");
  const [jobs, setJobs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [extraction, setExtraction] = useState<ImportExtractionResult | null>(null);
  const [rawMatrix, setRawMatrix] = useState<string[][]>([]);
  const [manualMapping, setManualMapping] = useState<Record<string, number>>({});
  const [selectedSheet, setSelectedSheet] = useState("");

  const load = async () => {
    try {
      setJobs(await estateImportService.getJobs(organizationId));
    } catch {
      toast.error("Unable to load import history.");
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const mappedMatrix = useMemo(() => {
    if (rawMatrix.length === 0) return [];
    if (Object.keys(manualMapping).length > 0) {
      return applyManualHeaderMapping(rawMatrix, manualMapping);
    }
    return applyHeaderMapping(rawMatrix, type);
  }, [rawMatrix, manualMapping, type]);

  useEffect(() => {
    if (mappedMatrix.length === 0) {
      setRows([]);
      return;
    }
    setRows(
      type === "estates_units"
        ? parseEstateUnitsTable(mappedMatrix)
        : parseOccupanciesTable(mappedMatrix),
    );
  }, [mappedMatrix, type]);

  const applyExtraction = (result: ImportExtractionResult) => {
    setExtraction(result);
    setRawMatrix(result.matrix);
    setManualMapping({});
  };

  const ingestFile = async (file: File, sheetName?: string) => {
    setName(file.name);
    setBusy(true);
    try {
      const result = sheetName
        ? await readSpreadsheetSheet(file, sheetName, type)
        : await readImportDocument(file, { importType: type, sheetName });
      applyExtraction(result);
      if (result.sheetNames?.length) {
        setSelectedSheet(sheetName || result.sheetNames[0] || "");
      }
      toast.success(`Loaded ${file.name}`);
      if (shouldOfferAiAssist(result)) {
        toast.info("Low confidence extraction — map columns or use AI assist.");
      }
    } catch (error) {
      toast.error(importFileErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    await ingestFile(file);
    e.target.value = "";
  };

  const onSheetChange = async (sheet: string) => {
    setSelectedSheet(sheet);
    if (pendingFile && sheet) {
      await ingestFile(pendingFile, sheet);
    }
  };

  const runAiAssist = async () => {
    if (!extraction) return;
    setBusy(true);
    try {
      const ai = await requestAiImportExtract({
        organizationId,
        importType: type,
        fileName: name || "import",
        extractedText: extraction.extractedText,
        matrixSample: extraction.matrix.slice(0, 30),
      });
      if (!isAiExtractSuccess(ai)) {
        toast.error(ai.reason);
        return;
      }
      applyExtraction(aiResultToExtraction(ai, extraction.sourceFormat, extraction.extractedText));
      toast.success("AI mapping applied — review rows before import.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI assist failed.");
    } finally {
      setBusy(false);
    }
  };

  const run = async (id: string) => {
    try {
      setBusy(true);
      const count = await estateImportService.importJob({
        jobId: id,
        organizationId,
        userId: currentUserId,
      });
      toast.success(`${count} row(s) imported.`);
      await load();
    } catch {
      toast.error("Import could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!rows.length) return;
    try {
      setBusy(true);
      const job = await estateImportService.createJob({
        organizationId,
        fileName: name || "estate-import",
        rows,
        userId: currentUserId,
        importType: type,
        extraction: extraction
          ? {
              sourceFormat: extraction.sourceFormat,
              extractionMethod: extraction.method,
              extractionConfidence: extraction.confidence,
            }
          : undefined,
      });
      await load();
      setRows([]);
      setExtraction(null);
      setRawMatrix([]);
      if (rows.every((x) => !x.errors.length)) {
        await run(job.id);
      } else {
        toast.info("Import saved to history. Correct invalid rows and re-import.");
      }
    } catch {
      toast.error("Unable to save import.");
    } finally {
      setBusy(false);
    }
  };

  const valid = rows.filter((x) => !x.errors.length).length;
  const invalid = rows.length - valid;
  const rawHeaders = rawMatrix[0] || [];
  const headerMapping = rawHeaders.length ? mapHeaders(rawHeaders, type) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Data Migration & Import</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Universal import: {IMPORT_FORMATS_LABEL}. Review extracted rows before approving.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setType("estates_units");
              setRows([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              type === "estates_units"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Estates & Units
          </button>
          <button
            type="button"
            onClick={() => {
              setType("occupancies");
              setRows([]);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              type === "occupancies"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Occupancy History
          </button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors bg-muted/20">
          <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileUp className="h-6 w-6" />}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {name ? `Selected: ${name}` : "Click or drag any supported document"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{IMPORT_FORMATS_LABEL}</p>
          <input className="sr-only" type="file" accept={IMPORT_FILE_ACCEPT} onChange={choose} disabled={busy} />
        </label>

        {extraction && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Badge variant="outline">Source: {extraction.sourceFormat}</Badge>
            <Badge variant="secondary">Method: {extraction.method.replace(/_/g, " ")}</Badge>
            <Badge variant="outline">Confidence: {Math.round(extraction.confidence * 100)}%</Badge>
            {extraction.warnings.map((w) => (
              <span key={w} className="text-amber-600 dark:text-amber-400">
                {w}
              </span>
            ))}
          </div>
        )}

        {extraction?.sheetNames && extraction.sheetNames.length > 1 && (
          <label className="text-xs flex flex-col gap-1 max-w-xs">
            <span className="font-medium">Excel worksheet</span>
            <select
              className="rounded-md border border-border bg-background px-2 py-1.5"
              value={selectedSheet}
              onChange={(e) => void onSheetChange(e.target.value)}
            >
              {extraction.sheetNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}

        {headerMapping && headerMapping.missing.length > 0 && rawHeaders.length > 0 && (
          <ImportColumnMapper
            importType={type}
            rawHeaders={rawHeaders}
            manualMapping={manualMapping}
            onChange={setManualMapping}
          />
        )}

        {extraction && shouldOfferAiAssist(extraction) && (
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void runAiAssist()}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Improve mapping with AI
          </Button>
        )}

        {rows.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{rows.length} total rows</Badge>
                <Badge variant="default" className="bg-emerald-600">
                  {valid} valid
                </Badge>
                {invalid > 0 && <Badge variant="destructive">{invalid} errors</Badge>}
              </div>
              <Button disabled={busy || valid === 0} onClick={() => void save()} size="sm" className="gap-1.5">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Approve & Import {valid} Records
              </Button>
            </div>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {rows.slice(0, 50).map((row) => (
                <div
                  key={row.rowNumber}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs bg-background"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-muted-foreground font-mono">#{row.rowNumber}</span>
                    <span className="font-medium text-foreground truncate">
                      {row.estateName} · {row.unitIdentifier}
                    </span>
                  </div>
                  {row.errors.length ? (
                    <span className="text-destructive font-medium truncate max-w-xs text-right">
                      {row.errors.join(", ")}
                    </span>
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Import History & Audit Log</h2>
        </div>
        {jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No previous imports found for this workspace.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border border-border text-xs gap-2"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{job.file_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {job.imported_rows ?? 0}/{job.total_rows} imported
                    {(job.failed_rows ?? 0) > 0 ? ` · ${job.failed_rows} failed` : ""}
                    {job.extraction_method ? ` · ${job.extraction_method}` : ""}
                    {job.extraction_confidence != null
                      ? ` · ${Math.round(Number(job.extraction_confidence) * 100)}% conf`
                      : ""}{" "}
                    · {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {job.import_type?.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant={importJobStatusVariant(job.status)} className="capitalize text-[10px]">
                    {String(job.status).replace(/_/g, " ")}
                  </Badge>
                  {["validated", "partially_imported", "failed"].includes(job.status) &&
                    job.valid_rows === job.total_rows && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(job.id)} className="h-7 text-xs">
                        Import Now
                      </Button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
