import { useEffect, useState } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
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
} from "../../../lib/document-import";
import { shouldOfferAiAssist } from "../../../lib/import-pipeline";
import { useImportMapping } from "../../../lib/use-import-mapping";
import { ImportMappingPanel } from "../../components/workspace/ImportMappingPanel";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

interface OpeningBalanceImportProps {
  organizationId: string;
  currentUserId: string;
}

export function OpeningBalanceImport({ organizationId, currentUserId }: OpeningBalanceImportProps) {
  const mapping = useImportMapping("opening_charges");
  const [rows, setRows] = useState<OpeningChargeImportRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!mapping.mappedMatrix.length || !mapping.mappingComplete) {
      setRows([]);
      return;
    }
    setRows(parseOpeningChargesTable(mapping.mappedMatrix));
  }, [mapping.mappedMatrix, mapping.mappingComplete]);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const extraction = await mapping.loadFile(file);
      toast.success(`Loaded ${file.name}`);
      if (shouldOfferAiAssist(extraction)) {
        toast.info("Some columns were not detected. Review mapping below or use AI assist.");
      }
    } catch (error) {
      toast.error(importFileErrorMessage(error));
    }
    e.target.value = "";
  };

  const runAi = async () => {
    const result = await mapping.runAiAssist(organizationId);
    if (!result.ok) {
      toast.error(result.reason);
      return;
    }
    toast.success("AI mapping applied — review rows before import.");
  };

  const importRows = async () => {
    if (!mapping.mappingComplete) {
      toast.error("Map all required columns before import.");
      return;
    }
    try {
      setBusy(true);
      const job = await openingChargeImportService.createJob({
        organizationId,
        userId: currentUserId,
        fileName: mapping.fileName || "opening-charges.csv",
        rows,
        extraction: mapping.extraction
          ? {
              sourceFormat: mapping.extraction.sourceFormat,
              extractionMethod: mapping.extraction.method,
              extractionConfidence: mapping.extraction.confidence,
            }
          : undefined,
      });
      const count = await openingChargeImportService.execute({
        jobId: job.id,
        organizationId,
        userId: currentUserId,
      });
      toast.success(`${count} opening charge(s) imported.`);
      mapping.reset();
      setRows([]);
    } catch (error) {
      console.error(error);
      toast.error("Unable to import opening charges.");
    } finally {
      setBusy(false);
    }
  };

  const valid = rows.filter((x) => !x.errors.length).length;
  const invalid = rows.length - valid;
  const rawHeaders = mapping.rawMatrix[0] || [];

  return (
    <WorkspacePageShell
      tone="finance"
      title="Opening Balances Import"
      description="Import pre-existing tenant arrears into the ledger to begin generating accurate statements."
    >
      <OperationalQueryState phase="ready">
      <Card className="p-6 space-y-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-colors bg-muted/20">
          <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
            {mapping.busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <FileSpreadsheet className="h-6 w-6" />}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {mapping.fileName ? `Selected: ${mapping.fileName}` : "Upload opening balances spreadsheet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {IMPORT_FORMATS_LABEL}. Map columns if headers differ from the template.
          </p>
          <input
            className="sr-only"
            type="file"
            accept={IMPORT_FILE_ACCEPT}
            onChange={choose}
            disabled={mapping.busy}
          />
        </label>

        <ImportMappingPanel
          importType="opening_charges"
          extraction={mapping.extraction}
          rawHeaders={rawHeaders}
          headerResult={mapping.headerResult}
          effectiveMapping={mapping.effectiveMapping}
          overrides={mapping.overrides}
          mappingComplete={mapping.mappingComplete}
          mappingWarnings={mapping.mappingWarnings}
          shouldOfferAi={mapping.shouldOfferAi}
          busy={mapping.busy}
          selectedSheet={mapping.selectedSheet}
          sheetNames={mapping.extraction?.sheetNames}
          onOverride={mapping.setOverride}
          onSheetChange={(sheet) => void mapping.reloadSheet(sheet)}
          onAiAssist={() => void runAi()}
        />

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
                disabled={busy || valid !== rows.length || !mapping.mappingComplete}
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
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
