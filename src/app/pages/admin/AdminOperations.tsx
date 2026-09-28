import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  platformOperationsService,
  type HealthSnapshot,
} from "../../../lib/platform-operations.service";
import { ActivityFeed } from "../../components/admin/ActivityFeed";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";

export function AdminOperations() {
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [healthError, setHealthError] = useState("");
  const [eventsError, setEventsError] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function refresh() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setHealthError("");
    setEventsError("");

    const [h, e] = await Promise.allSettled([
      platformOperationsService.checkHealth(),
      platformOperationsService.events(),
    ]);

    if (h.status === "fulfilled") {
      setHealth(h.value);
    } else {
      setHealthError(h.reason?.message || "Health status is currently unavailable");
    }

    if (e.status === "fulfilled") {
      setEvents(e.value);
    } else {
      setEventsError(e.reason?.message || "Event log is currently unavailable");
    }

    setBusy(false);
    inFlight.current = false;
  }

  useEffect(() => {
    void refresh();
  }, []);

  const isStale = health ? now - Date.parse(health.checkedAt) > 5 * 60 * 1000 : false;

  return (
    <div className="space-y-6">
      {/* ── System Status Header & Run Check ── */}
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                System Operations & Health
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Real-time monitoring of application availability, background services, and third-party integrations.
            </p>
          </div>

          <Button
            disabled={busy}
            onClick={() => void refresh()}
            className="flex items-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking system...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Run Health Check
              </>
            )}
          </Button>
        </div>

        {healthError && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{healthError}. Showing previous recorded snapshot.</span>
          </div>
        )}

        {health && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-b border-border pb-3">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Last inspected {new Date(health.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {isStale && (
                <span className="text-amber-600 font-medium">
                  Snapshot is over 5 minutes old — click Run Health Check for current metrics.
                </span>
              )}
            </div>

            {/* Service Checks Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {health.checks.map((check) => {
                const isSuccess = check.status === "healthy" || check.status === "ok";
                const isWarning = check.status === "degraded" || check.status === "warning";

                return (
                  <div
                    key={check.name}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isSuccess ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : isWarning ? (
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                        )}
                        <span className="text-sm font-semibold capitalize text-foreground">
                          {check.name}
                        </span>
                      </div>

                      <Badge
                        variant={isSuccess ? "outline" : isWarning ? "secondary" : "destructive"}
                        className="text-xs uppercase font-medium"
                      >
                        {check.status}
                      </Badge>
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {check.detail || "Operational"}
                    </p>

                    {check.latencyMs !== undefined && (
                      <div className="mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground font-mono">
                        Response: {check.latencyMs} ms
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Integrations summary */}
            {health.integrations && health.integrations.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Connected Integrations
                </h4>
                <div className="flex flex-wrap gap-2">
                  {health.integrations.map((i) => (
                    <Badge
                      key={i.name}
                      variant="outline"
                      className={`text-xs py-1 px-2.5 ${
                        i.configured
                          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {i.name}: {i.configured ? "Configured" : "Pending setup"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Recent Service Events ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Recent Service Events</h3>
          </div>
          {events.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {events.length} logged
            </Badge>
          )}
        </div>

        {eventsError ? (
          <p role="alert" className="text-sm text-destructive">
            {eventsError}
          </p>
        ) : events.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500/70" />
            No service incidents or critical alerts recorded.
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-border p-3.5 text-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={e.severity === "critical" || e.severity === "error" ? "destructive" : "secondary"}
                      className="text-[10px] uppercase font-bold"
                    >
                      {e.severity}
                    </Badge>
                    <span className="font-semibold text-foreground">{e.service}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{e.message}</p>
                </div>
                <time className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(e.created_at).toLocaleString([], {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Activity Feed */}
      <Card className="p-6">
        <ActivityFeed />
      </Card>
    </div>
  );
}
