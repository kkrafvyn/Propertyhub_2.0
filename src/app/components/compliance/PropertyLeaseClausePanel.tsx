import { Textarea } from "@/app/components/ui/textarea";
import { useMemo, useState } from "react";
import { Download, FileText, Scale } from "lucide-react";
import { toast } from "sonner";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/badge";
import {
  downloadLeaseSchedule,
  generateLeaseSchedule,
} from "../../../lib/lease-clause-generator.service";
import {
  downloadLeaseScheduleHtml,
  printLeaseScheduleAsPdf,
} from "../../../lib/lease-pdf-export.service";
import { analyzeLeaseForProperty } from "../../../lib/jurisdiction-lease-analyzer.service";
import type { PropertyLocationInput } from "../../../lib/property-country-context.service";

interface PropertyLeaseClausePanelProps {
  property?: PropertyLocationInput & { address?: string | null; ghana_post_gps?: string | null };
  landlordName?: string;
  tenantName?: string;
  rentAmountMajor?: number;
  currency?: string;
  leaseDraftText?: string;
}

export function PropertyLeaseClausePanel({
  property,
  landlordName,
  tenantName,
  rentAmountMajor,
  currency,
  leaseDraftText,
}: PropertyLeaseClausePanelProps) {
  const [draftText, setDraftText] = useState(leaseDraftText || "");

  const schedule = useMemo(() => {
    if (!property?.country && !property?.city) return null;
    return generateLeaseSchedule({
      property: property ?? {},
      landlordName,
      tenantName,
      rentAmountMajor,
      currency,
    });
  }, [property, landlordName, tenantName, rentAmountMajor, currency]);

  const analysis = useMemo(() => {
    if (!property || !draftText.trim()) return null;
    return analyzeLeaseForProperty(draftText, property);
  }, [property, draftText]);

  if (!schedule) {
    return (
      <Card className="p-4 text-sm text-muted-foreground">
        Add property location to generate jurisdiction-specific lease clauses.
      </Card>
    );
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 text-brand-forest" />
        <h3 className="font-semibold">Jurisdiction lease schedule</h3>
        <Badge variant="outline">{schedule.jurisdictionLabel}</Badge>
        {schedule.subdivisionLabel ? (
          <Badge variant="secondary">{schedule.subdivisionLabel}</Badge>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Governing law: {schedule.governingLaw} · {schedule.paymentRail}
      </p>

      {schedule.warnings.length > 0 && (
        <ul className="text-xs list-disc pl-4 text-amber-800 bg-amber-50 rounded-lg p-3 space-y-1">
          {schedule.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            downloadLeaseSchedule(schedule);
            toast.success("Lease schedule downloaded.");
          }}
        >
          <Download className="h-4 w-4 mr-1" /> Download schedule
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            downloadLeaseScheduleHtml(schedule);
            toast.success("Lease HTML saved — open in browser and print to PDF.");
          }}
        >
          <Download className="h-4 w-4 mr-1" /> Save HTML
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            printLeaseScheduleAsPdf(schedule);
            toast.success("Print dialog opened — save as PDF.");
          }}
        >
          <FileText className="h-4 w-4 mr-1" /> Print / PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(schedule.markdown);
            toast.success("Copied to clipboard.");
          }}
        >
          <FileText className="h-4 w-4 mr-1" /> Copy markdown
        </Button>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer font-medium text-ink">Preview mandatory clauses</summary>
        <ol className="mt-2 list-decimal pl-5 space-y-1 text-muted-foreground">
          {schedule.mandatoryClauses.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ol>
      </details>

      <div className="space-y-2 border-t pt-4">
        <label className="text-sm font-medium">Audit draft against {schedule.subdivisionLabel || schedule.jurisdictionLabel}</label>
        <Textarea
          className="w-full min-h-[120px] rounded-lg border px-3 py-2 text-sm"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder="Paste lease draft to check deposit caps, advance rent, and required clauses…"
        />
        {analysis ? (
          <div className="rounded-lg bg-surface-subtle p-3 text-sm">
            <p className="font-medium">
              Score {analysis.overallScore}/100 — {analysis.complianceGrade}
            </p>
            {analysis.requiredClausesMissing.length > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Missing: {analysis.requiredClausesMissing.slice(0, 3).join("; ")}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
