import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { getPlatformGrants } from "../../../lib/platform-access";
import { getPlatformStaffDashboardConfig } from "../../lib/role-dashboard";
import {
  loadStaffCommandCenterSnapshot,
  type CommandCenterSnapshot,
} from "../../../lib/platform-admin-dashboard.service";
import { ActivityFeed } from "../../components/admin/ActivityFeed";
import { AdminEnrollmentRequests } from "./AdminEnrollmentRequests";
import { canAccessAdminSection } from "../../../lib/platform-access";

export function StaffOverview() {
  const { profile, role } = useAuth();
  const grants = useMemo(() => getPlatformGrants(profile), [profile]);
  const staffDashboard = useMemo(() => getPlatformStaffDashboardConfig(role), [role]);
  const [snapshot, setSnapshot] = useState<Partial<CommandCenterSnapshot> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadStaffCommandCenterSnapshot(grants)
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [grants]);

  const mod = snapshot?.moderationOverview;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{staffDashboard.kicker}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{staffDashboard.heading}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{staffDashboard.description}</p>
          </div>
          <Link to={staffDashboard.primaryActionHref}>
            <Button size="sm">{staffDashboard.primaryActionLabel}</Button>
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {staffDashboard.summaryCards.map((card) => (
            <Link
              key={card.label}
              to={card.href}
              className="rounded-xl border border-primary/15 bg-background/70 p-3 transition-colors hover:border-primary/40"
            >
              <p className="text-sm font-semibold">{card.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">Open workspace</p>
            </Link>
          ))}
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canAccessAdminSection(profile, "moderation") ? (
            <>
              <Metric label="Pending alerts" value={mod?.pendingAlerts ?? "—"} />
              <Metric label="Open cases" value={mod?.openCases ?? "—"} />
            </>
          ) : null}
          {canAccessAdminSection(profile, "payments") || canAccessAdminSection(profile, "revenue") ? (
            <Metric label="Payments (24h)" value={snapshot?.paymentCount24h ?? "—"} />
          ) : null}
          {canAccessAdminSection(profile, "communications") ? (
            <Metric label="Failed deliveries (24h)" value={snapshot?.failedDeliveries24h ?? "—"} />
          ) : null}
          {canAccessAdminSection(profile, "ai") ? (
            <Metric label="Pending AI actions" value={snapshot?.pendingAiActions ?? "—"} />
          ) : null}
        </div>
      )}

      {canAccessAdminSection(profile, "organizations") ? (
        <AdminEnrollmentRequests onApproved={() => undefined} />
      ) : null}

      {canAccessAdminSection(profile, "integrations") ? (
        <Card className="p-6">
          <ActivityFeed />
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </Card>
  );
}
