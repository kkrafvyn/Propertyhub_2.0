import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Building2, CircleDollarSign, ClipboardList, Loader2, Wrench } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import {
  estateOperationsService,
  type EstateIssue,
  type EstateUnit,
  type EstateWorkOrder,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import { getChargeOutstandingMinor, type EstateChargeRow } from "../../../lib/estate-ledger";

interface Unit360Props {
  organizationId: string;
}

export function Unit360({ organizationId }: Unit360Props) {
  const [loading, setLoading] = useState(true);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [charges, setCharges] = useState<EstateChargeRow[]>([]);
  const [issues, setIssues] = useState<EstateIssue[]>([]);
  const [workOrders, setWorkOrders] = useState<EstateWorkOrder[]>([]);
  const [estateId, setEstateId] = useState("");
  const [unitId, setUnitId] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const rows = await estateOperationsService.getEstates(organizationId);
        const ids = rows.map((x) => x.id);
        const unitRows = await estateOperationsService.getUnits(ids);
        const [chargeRows, issueRows, orderRows] = await Promise.all([
          estateOperationsService.getCharges(unitRows.map((x) => x.id)),
          estateOperationsService.getIssues(ids),
          estateOperationsService.getWorkOrders(ids),
        ]);

        setEstates(rows);
        setUnits(unitRows);
        setCharges(chargeRows);
        setIssues(issueRows);
        setWorkOrders(orderRows);
        setEstateId(rows[0]?.id || "");
      } finally {
        setLoading(false);
      }
    })();
  }, [organizationId]);

  const estateUnits = useMemo(
    () => units.filter((x) => x.estate_id === estateId),
    [units, estateId],
  );

  const selected = units.find((x) => x.id === unitId) || null;
  const statement = useMemo(
    () =>
      charges
        .filter((x) => x.unit_id === unitId)
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [charges, unitId],
  );

  const outstanding = statement.reduce(
    (sum, x) => sum + Math.max(0, getChargeOutstandingMinor(x)),
    0,
  );
  const unitIssues = useMemo(() => issues.filter((x) => x.unit_id === unitId), [issues, unitId]);
  const unitOrders = useMemo(
    () => workOrders.filter((x) => unitIssues.some((issue) => issue.id === x.issue_id)),
    [workOrders, unitIssues],
  );

  const currency = estates.find((x) => x.id === estateId)?.currency || "GHS";
  const money = (value: number) =>
    new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(value / 100);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading unit profile…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Unit 360</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Single unit operational view across tenancy status, charges, and maintenance history.
        </p>
      </div>

      {/* Selectors */}
      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Property:</label>
          <NativeSelectControl
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            value={estateId}
            onChange={(e) => {
              setEstateId(e.target.value);
              setUnitId("");
            }}
          >
            <option value="">Choose property…</option>
            {estates.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </NativeSelectControl>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Unit:</label>
          <NativeSelectControl
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            disabled={!estateId || estateUnits.length === 0}
          >
            <option value="">{estateUnits.length === 0 ? "No units found" : "Choose unit…"}</option>
            {estateUnits.map((x) => (
              <option key={x.id} value={x.id}>
                {x.identifier}
              </option>
            ))}
          </NativeSelectControl>
        </div>
      </Card>

      {!selected ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-10 w-10 opacity-40 text-primary" />
          <p className="text-sm font-semibold text-foreground">No unit selected</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Choose a property and unit above to open its complete statement and maintenance history.
          </p>
        </Card>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Unit Identifier</span>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{selected.identifier}</p>
              <Badge className="mt-2 capitalize text-[10px]" variant="outline">
                {selected.status?.replace(/_/g, " ") || "Active"}
              </Badge>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Outstanding</span>
                <CircleDollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{money(outstanding)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {outstanding > 0 ? "Unpaid balance" : "Fully settled"}
              </p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Issues</span>
                <Wrench className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{unitIssues.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Recorded maintenance tickets</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Work Orders</span>
                <ClipboardList className="h-4 w-4 text-purple-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{unitOrders.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Dispatched repair jobs</p>
            </Card>
          </div>

          {/* Details */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Statement */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Unit Statement</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {statement.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No charges recorded.</p>
                ) : (
                  statement.map((x) => (
                    <div
                      key={x.id}
                      className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                    >
                      <div>
                        <span className="font-medium text-foreground">{x.description || x.type}</span>
                        <p className="text-[11px] text-muted-foreground">Due: {x.due_date}</p>
                      </div>
                      <span className="font-semibold text-foreground">
                        {money(getChargeOutstandingMinor(x))}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Maintenance History */}
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Maintenance History</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {unitIssues.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No issues recorded.</p>
                ) : (
                  unitIssues.map((x) => (
                    <div
                      key={x.id}
                      className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                    >
                      <div>
                        <p className="font-medium text-foreground">{x.title}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {x.priority} priority
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {x.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
