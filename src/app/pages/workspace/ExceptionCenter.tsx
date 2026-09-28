import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertOctagon,
  AlertTriangle,
  Clock,
  Wrench,
  KeyRound,
  FileWarning,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import {
  exceptionCenterService,
  type OperationalException,
} from "../../../lib/exception-center.service";

export function ExceptionCenter({
  organizationId,
}: {
  organizationId?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<OperationalException[]>([]);

  const loadExceptions = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      const list = await exceptionCenterService.getOperationalExceptions(organizationId);
      setExceptions(list);
    } catch (err: any) {
      toast.error(err.message || "Failed to load exception center");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExceptions();
  }, [organizationId]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-200">Critical</Badge>;
      case "warning":
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Warning</Badge>;
      default:
        return <Badge variant="outline">Info</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "broken_promise":
        return <AlertOctagon className="w-4 h-4 text-rose-600" />;
      case "work_order_overdue":
        return <Wrench className="w-4 h-4 text-amber-600" />;
      case "lease_expiring":
        return <KeyRound className="w-4 h-4 text-blue-600" />;
      default:
        return <FileWarning className="w-4 h-4 text-ink-muted" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Issues & Alerts
          </h1>
          <p className="text-sm text-ink-muted">
            Real-time view of missed deadlines, overdue tasks, and actions that need your attention.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadExceptions}>
          <Clock className="w-4 h-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        {loading ? (
          <div className="py-12 text-center text-ink-muted">
          Checking for issues across your properties...
          </div>
        ) : exceptions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 mx-auto text-emerald-500 opacity-60" />
            <p className="text-ink-muted font-medium">
              No outstanding issues or overdue tasks found across your properties.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl border border-surface-border bg-surface hover:bg-surface-hover/30 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-surface-subtle border border-surface-border">
                    {getCategoryIcon(ex.category)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink text-sm">
                        {ex.title}
                      </span>
                      {getSeverityBadge(ex.severity)}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {ex.description}
                    </p>
                    <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-1">
                      <span>Action:</span>
                      <span className="font-normal text-ink">{ex.suggestedAction}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => toast.info("Assigned to AI agent for automated outreach")}
                  >
                    Auto-Resolve
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
