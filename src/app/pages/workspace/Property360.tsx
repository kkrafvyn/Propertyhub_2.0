import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Building2, FileText, Gauge, Loader2, Wrench } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import {
  estateOperationsService,
  type EstateIssue,
  type EstateOccupancy,
  type EstateUnit,
  type EstateWorkOrder,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import {
  getChargeOutstandingMinor,
  summarizeEstateLedger,
  type EstateChargeRow,
} from "../../../lib/estate-ledger";
import { enterpriseOperationsService } from "../../../lib/enterprise-operations.service";
import {
  filterEstatesByPropertyScope,
  type MemberScopeProps,
  withMemberScopeDefaults,
} from "../../../lib/member-scope";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";

const money = (v = 0, c = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: c }).format(v / 100);

interface Property360Props extends MemberScopeProps {
  organizationId: string;
}

export function Property360({
  organizationId,
  scopeMode = "organization",
  scopedPropertyIds = null,
  bypassPropertyScope = false,
}: Property360Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [occupancies, setOccupancies] = useState<EstateOccupancy[]>([]);
  const [charges, setCharges] = useState<EstateChargeRow[]>([]);
  const [issues, setIssues] = useState<EstateIssue[]>([]);
  const [orders, setOrders] = useState<EstateWorkOrder[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [enterprise, setEnterprise] = useState<any>({
    assets: [],
    meters: [],
    readings: [],
    budgets: [],
    procurement: [],
    contracts: [],
  });
  const [estateId, setEstateId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const scope = withMemberScopeDefaults({ scopeMode, scopedPropertyIds, bypassPropertyScope });
        const es = filterEstatesByPropertyScope(
          await estateOperationsService.getEstates(organizationId),
          scope.scopeMode,
          scope.scopedPropertyIds,
          scope.bypassPropertyScope,
        );
        const ids = es.map((x) => x.id);
        const us = await estateOperationsService.getUnits(ids);
        const [o, c, i, w, n, e] = await Promise.all([
          estateOperationsService.getOccupancies(us.map((x) => x.id)),
          estateOperationsService.getCharges(us.map((x) => x.id)),
          estateOperationsService.getIssues(ids),
          estateOperationsService.getWorkOrders(ids),
          estateOperationsService.getNotices(ids),
          enterpriseOperationsService.load(ids),
        ]);

        setEstates(es);
        setUnits(us);
        setOccupancies(o);
        setCharges(c);
        setIssues(i);
        setOrders(w);
        setNotices(n);
        setEnterprise(e);
        setEstateId(es[0]?.id || "");
    } catch {
      setLoadError("Unable to load property overview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId, scopeMode, scopedPropertyIds, bypassPropertyScope]);

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  const estate = estates.find((x) => x.id === estateId);
  const estateUnits = units.filter((x) => x.estate_id === estateId);
  const ids = estateUnits.map((x) => x.id);
  const ledger = useMemo(
    () => summarizeEstateLedger(charges.filter((x) => ids.includes(x.unit_id))),
    [charges, ids],
  );
  const active = occupancies.filter((x) => ids.includes(x.unit_id) && !x.end_date);
  const e = (key: string) => (enterprise[key] || []).filter((x: any) => x.estate_id === estateId);
  const currency = estate?.currency || "GHS";

  return (
    <WorkspacePageShell
      title="Property 360"
      description="Complete property profile combining units, financials, maintenance tickets, and contracts."
      actions={
        estates.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground shrink-0">Property:</span>
            <NativeSelectControl
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary min-w-[200px]"
              value={estateId}
              onChange={(x) => setEstateId(x.target.value)}
            >
              {estates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </NativeSelectControl>
          </div>
        ) : undefined
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void load()}
        loadingFallback={
          <div className="flex justify-center items-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading property overview…</span>
          </div>
        }
      >
    <div className="space-y-6">
      {estate ? (
        <>
          {/* Key Metrics */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Units & Occupancy</span>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {estateUnits.length}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({active.length} occupied)
                </span>
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Overdue Arrears</span>
                <span className="text-xs font-bold text-amber-500">
                  {money(ledger.overdueMinor, currency)}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {money(ledger.totalOutstandingMinor, currency)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Total outstanding</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Maintenance</span>
                <Wrench className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {
                  issues.filter(
                    (x) => x.estate_id === estateId && !["resolved", "closed"].includes(x.status),
                  ).length
                }{" "}
                <span className="text-xs font-normal text-muted-foreground">open issues</span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {
                  orders.filter(
                    (x) =>
                      x.estate_id === estateId && !["completed", "cancelled"].includes(x.status),
                  ).length
                }{" "}
                active work orders
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Assets & Contracts</span>
                <FileText className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {e("assets").length}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  / {e("contracts").length} contracts
                </span>
              </p>
            </Card>
          </div>

          {/* Section Grids */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Units & Occupancy */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Units & Occupancy</h2>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {estateUnits.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No units listed.</p>
                ) : (
                  estateUnits.map((unit) => {
                    const occ = active.find((x) => x.unit_id === unit.id);
                    const due = charges
                      .filter((x) => x.unit_id === unit.id)
                      .reduce((s, x) => s + Math.max(0, getChargeOutstandingMinor(x)), 0);

                    return (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                      >
                        <span className="font-medium text-foreground">
                          {unit.identifier} ·{" "}
                          <span className="text-muted-foreground font-normal">
                            {occ?.role || "Vacant"}
                          </span>
                        </span>
                        <span className="font-semibold text-foreground">{money(due, currency)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Maintenance */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Recent Maintenance</h2>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {issues.filter((x) => x.estate_id === estateId).length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No maintenance issues.</p>
                ) : (
                  issues
                    .filter((x) => x.estate_id === estateId)
                    .slice(0, 8)
                    .map((x) => (
                      <div
                        key={x.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                      >
                        <span className="text-foreground truncate max-w-[220px]">{x.title}</span>
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {x.status}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </Card>

            {/* Assets & Utilities */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Gauge className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Assets & Utilities</h2>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {[...e("assets"), ...e("meters")].length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No assets or meters on file.</p>
                ) : (
                  [...e("assets"), ...e("meters")].slice(0, 8).map((x: any) => (
                    <div
                      key={x.id}
                      className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                    >
                      <span className="font-medium text-foreground">{x.name || x.identifier}</span>
                      <span className="text-muted-foreground capitalize">
                        {x.asset_type || x.utility_type}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Contracts & Notices */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Contracts & Notices</h2>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {[
                  ...e("contracts").map((x: any) => ({ id: x.id, label: `Contract: ${x.title}` })),
                  ...notices
                    .filter((x: any) => x.estate_id === estateId)
                    .map((x: any) => ({ id: x.id, label: `Notice: ${x.subject}` })),
                ].length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No contracts or notices.</p>
                ) : (
                  [
                    ...e("contracts").map((x: any) => ({ id: x.id, label: `Contract: ${x.title}` })),
                    ...notices
                      .filter((x: any) => x.estate_id === estateId)
                      .map((x: any) => ({ id: x.id, label: `Notice: ${x.subject}` })),
                  ]
                    .slice(0, 8)
                    .map((x) => (
                      <div
                        key={x.id}
                        className="rounded-lg border border-border p-2.5 text-xs text-foreground truncate"
                      >
                        {x.label}
                      </div>
                    ))
                )}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-10 w-10 opacity-40 text-primary" />
          <p className="text-sm font-semibold text-foreground">No property selected</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Add or select a managed estate to view its full operational record.
          </p>
        </Card>
      )}
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
