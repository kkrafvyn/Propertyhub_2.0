import { useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import { openingChargeImportService } from "../../../lib/opening-charge-import.service";
import { parseOpeningChargesTable, type OpeningChargeImportRow } from "../../../lib/estate-import.service";
import {
  IMPORT_FILE_ACCEPT,
  IMPORT_FORMATS_LABEL,
  importFileErrorMessage,
  type ImportExtractionResult,
} from "../../../lib/document-import";
import { extractMappedMatrix } from "../../../lib/import-pipeline";

interface OpeningBalanceImportProps {
  organizationId: string;
  currentUserId: string;
}

export function OpeningBalanceImport({
  organizationId,
  currentUserId,
}: OpeningBalanceImportProps) {
  const [rows, setRows] = useState<OpeningChargeImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [extraction, setExtraction] = useState<ImportExtractionResult | null>(null);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const { extraction: ext, matrix } = await extractMappedMatrix(file, "opening_charges");
      setExtraction(ext);
      setRows(parseOpeningChargesTable(matrix));
      toast.success(`Loaded ${file.name}`);
    } catch (error) {
      toast.error(importFileErrorMessage(error));
    }
  };

  const importRows = async () => {
    try {
      setBusy(true);
      const job = await openingChargeImportService.createJob({
        organizationId,
        userId: currentUserId,
        fileName: fileName || "opening-charges.csv",
        rows,
        extraction: extraction
          ? {
              sourceFormat: extraction.sourceFormat,
              extractionMethod: extraction.method,
              extractionConfidence: extraction.confidence,
            }
          : undefined,
      });
      const count = await openingChargeImportService.execute({
        jobId: job.id,
        organizationId,
        userId: currentUserId,
      });
      toast.success(`${count} opening charge(s) imported.`);
      setRows([]);
      setFileName("");
    } catch (error) {
      console.error(error);
      toast.error("Unable to import opening charges.");
    } finally {
      setBusy(false);
    }
  };

  const valid = rows.filter((x) => !x.errors.length).length;
  const invalid = rows.length - valid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Opening Balances Import</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Import pre-existing tenant arrears into the ledger to begin generating accurate statements.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        {/* Upload dropzone */}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors bg-muted/20">
          <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {fileName ? `Selected: ${fileName}` : "Upload opening balances spreadsheet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {IMPORT_FORMATS_LABEL}. Required columns:{" "}
            <span className="font-mono">estate_name, unit_identifier, amount, due_date, charge_type, description</span>
          </p>
          <input className="sr-only" type="file" accept={IMPORT_FILE_ACCEPT} onChange={choose} />
        </label>

        {/* Validation and List */}
        {rows.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{rows.length} rows</Badge>
                <Badge variant="default" className="bg-emerald-600">
                  {valid} valid
                </Badge>
                {invalid > 0 && <Badge variant="destructive">{invalid} errors</Badge>}
              </div>

              <Button
                disabled={busy || valid !== rows.length}
                onClick={() => void importRows()}
                size="sm"
                className="gap-1.5"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Approve & Import {valid} Charges
              </Button>
            </div>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {rows.map((row) => (
                <div
                  key={row.rowNumber}
                  className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs bg-background"
                >
                  <div className="space-y-0.5 truncate">
                    <span className="font-medium text-foreground">
                      #{row.rowNumber} · {row.estateName} · {row.unitIdentifier}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Amount: {row.amount} · Type: {row.chargeType || "General"}
                    </p>
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
    </div>
  );
}
