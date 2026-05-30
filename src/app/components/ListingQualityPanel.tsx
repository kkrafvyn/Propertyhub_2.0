import { AlertTriangle, CheckCircle2, CircleDashed, ShieldCheck } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/Card";
import type { ListingQualityReport } from "../../lib/listing-quality.service";

function getStatusIcon(status: string) {
  if (status === "passed") return CheckCircle2;
  if (status === "warning") return AlertTriangle;
  return CircleDashed;
}

function getStatusClasses(status: string) {
  if (status === "passed") return "text-primary";
  if (status === "warning") return "text-amber-700";
  if (status === "failed") return "text-red-700";
  return "text-muted-foreground";
}

export function ListingQualityPanel({
  report,
  compact = false,
}: {
  report: ListingQualityReport;
  compact?: boolean;
}) {
  const readyForPublicPromotion = report.score >= 75;

  return (
    <Card className={compact ? "p-4" : "p-6"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Ghana listing quality</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Trust checks for GhanaPostGPS, proof, photos, pricing, and lead readiness.
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold">{report.score}</p>
          <Badge variant={readyForPublicPromotion ? "default" : "secondary"}>
            {readyForPublicPromotion ? "Promotion ready" : "Needs work"}
          </Badge>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${report.score}%` }}
        />
      </div>

      <div className={compact ? "mt-4 grid gap-2" : "mt-5 grid gap-3 md:grid-cols-2"}>
        {report.checks.map((check) => {
          const Icon = getStatusIcon(check.status);
          return (
            <div key={check.key} className="rounded-lg border border-border p-3">
              <div className="flex items-start gap-2">
                <Icon className={`mt-0.5 h-4 w-4 ${getStatusClasses(check.status)}`} />
                <div>
                  <p className="text-sm font-medium">{check.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{check.details}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
