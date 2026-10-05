import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import { ActivityFeed } from "../../components/admin/ActivityFeed";
import {
  loadOwnerCommandCenterSnapshot,
  type CommandCenterSnapshot,
} from "../../../lib/platform-admin-dashboard.service";
import { PLATFORM_ROLE_PRESETS } from "../../../lib/platform-console-grants";
import { AdminEnrollmentRequests } from "./AdminEnrollmentRequests";

export function PlatformCommandCenter() {
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadOwnerCommandCenterSnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-10 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
        <p className="text-muted-foreground">Loading command center…</p>
      </Card>
    );
  }

  const mod = snapshot?.moderationOverview;
  const health = snapshot?.health;
  const healthLabel =
    health?.checks?.every((c) => c.status === "ok" || c.status === "healthy")
      ? "healthy"
      : health
        ? "degraded"
        : "unknown";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Platform owner</p>
        <h1 className="text-3xl font-semibold mt-1">Command Center</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Whole-platform KPIs, team workload, integration health, and owner controls in one place.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pending alerts" value={mod?.pendingAlerts ?? "—"} href="/admin/moderation" />
        <KpiCard label="Open cases" value={mod?.openCases ?? "—"} href="/admin/moderation" />
        <KpiCard label="Payments (24h)" value={snapshot?.paymentCount24h ?? "—"} href="/admin/payments" />
        <KpiCard label="Failed comms (24h)" value={snapshot?.failedDeliveries24h ?? "—"} href="/admin/communications" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Platform health</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {healthLabel === "healthy"
                  ? "All monitored checks passing."
                  : healthLabel === "degraded"
                    ? "Some checks need attention."
                    : "Health snapshot unavailable."}
              </p>
            </div>
            <Badge variant={healthLabel === "healthy" ? "default" : "secondary"}>{healthLabel}</Badge>
          </div>
          <Link to="/admin/integrations" className="inline-block mt-4">
            <Button size="sm" variant="outline">
              Integrations & jobs
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold">Platform team</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {snapshot?.staffCounts.admins ?? 0} owner · {snapshot?.staffCounts.delegates ?? 0} delegates
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(snapshot?.staffCounts.byPreset ?? {}).map(([preset, count]) => (
              <Badge key={preset} variant="outline">
                {preset === "owner"
                  ? "Owner"
                  : PLATFORM_ROLE_PRESETS[preset as keyof typeof PLATFORM_ROLE_PRESETS]?.label ?? preset}{" "}
                · {count}
              </Badge>
            ))}
          </div>
          <Link to="/admin/team" className="inline-block mt-4">
            <Button size="sm">Manage platform team</Button>
          </Link>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Owner quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/features">
            <Button size="sm" variant="secondary">
              Feature flags
            </Button>
          </Link>
          <Link to="/admin/revenue">
            <Button size="sm" variant="secondary">
              Revenue rules
            </Button>
          </Link>
          <Link to="/admin/settings">
            <Button size="sm" variant="secondary">
              Settings & backups
            </Button>
          </Link>
          <Link to="/admin/operations">
            <Button size="sm" variant="secondary">
              App & API health
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Work queues</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link className="text-primary hover:underline" to="/admin/moderation">
                Moderation & fraud triage
              </Link>
            </li>
            <li>
              <Link className="text-primary hover:underline" to="/admin/trust">
                Trust & KYC
              </Link>
            </li>
            <li>
              <Link className="text-primary hover:underline" to="/admin/support">
                Support lookup
              </Link>
            </li>
            <li>
              <Link className="text-primary hover:underline" to="/admin/organizations">
                Organizations & enrollment
              </Link>
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Recent role changes</h2>
          {(snapshot?.roleAudit?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No recent platform role assignments.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {snapshot?.roleAudit?.slice(0, 8).map((row) => (
                <li key={row.id} className="text-muted-foreground">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : "—"} · target{" "}
                  {row.target_id?.slice(0, 8) ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AdminEnrollmentRequests onApproved={() => undefined} />

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Operational events</h2>
        {(snapshot?.events?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No recent operational events.</p>
        ) : (
          <ul className="divide-y text-sm">
            {snapshot?.events?.slice(0, 12).map((ev) => (
              <li key={ev.id} className="py-2">
                <span className="font-medium">{ev.service}</span> · {ev.event_type}{" "}
                <span className="text-muted-foreground">{ev.message}</span>
              </li>
            ))}
          </ul>
        )}
        <ActivityFeed />
      </Card>
    </div>
  );
}

function KpiCard({ label, value, href }: { label: string; value: number | string; href: string }) {
  return (
    <Link to={href}>
      <Card className="p-4 hover:border-primary/40 transition-colors">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </Card>
    </Link>
  );
}
