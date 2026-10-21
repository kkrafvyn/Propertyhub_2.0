import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import { useEffect, useMemo, useState } from "react";
import { Building2, CircleDollarSign, Loader2, Mail, Phone, UserRound, Wrench } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import {
  estateOperationsService,
  type EstateIssue,
  type EstateOccupancy,
  type EstateUnit,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import { getChargeOutstandingMinor, type EstateChargeRow } from "../../../lib/estate-ledger";
import { supabase } from "../../../lib/supabase";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { toast } from "sonner";

const money = (v = 0, c = "GHS") =>
  new Intl.NumberFormat("en-GH", { style: "currency", currency: c }).format(v / 100);

function getInitials(name = "Customer") {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface Customer360Props {
  organizationId: string;
}

export function Customer360({ organizationId }: Customer360Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [units, setUnits] = useState<EstateUnit[]>([]);
  const [occupancies, setOccupancies] = useState<EstateOccupancy[]>([]);
  const [charges, setCharges] = useState<EstateChargeRow[]>([]);
  const [issues, setIssues] = useState<EstateIssue[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [userId, setUserId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const es = await estateOperationsService.getEstates(organizationId);
      const us = await estateOperationsService.getUnits(es.map((x) => x.id));
      const [o, c, i] = await Promise.all([
        estateOperationsService.getOccupancies(us.map((x) => x.id)),
        estateOperationsService.getCharges(us.map((x) => x.id)),
        estateOperationsService.getIssues(es.map((x) => x.id)),
      ]);

      const ids = [...new Set(o.map((x) => x.user_id))];
      const { data } = await supabase
        .from("users")
        .select("id, full_name, email, phone")
        .in("id", ids);

      setEstates(es);
      setUnits(us);
      setOccupancies(o);
      setCharges(c);
      setIssues(i);
      setPeople(data || []);
      setUserId(ids[0] || "");
    } catch {
      const message = "Unable to load customer records.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const person = people.find((x) => x.id === userId);
  const history = occupancies.filter((x) => x.user_id === userId);
  const unitIds = history.map((x) => x.unit_id);
  const customerCharges = charges.filter((x) => unitIds.includes(x.unit_id));
  const due = customerCharges.reduce((s, x) => s + Math.max(0, getChargeOutstandingMinor(x)), 0);
  const currency = estates[0]?.currency || "GHS";

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      title="Customer 360"
      description="Complete customer history across tenancy, payments, maintenance tickets, and units."
      actions={
        <>
          {people.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Customer:</span>
              <NativeSelectControl
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary min-w-[200px]"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              >
                {people.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.full_name || x.email || x.id}
                  </option>
                ))}
              </NativeSelectControl>
            </div>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </>
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void load()}
      >
    <div className="space-y-6">
      {person ? (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Contact Card */}
            <Card className="p-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-sm">
                {getInitials(person.full_name || person.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{person.full_name || "Customer"}</p>
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {person.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{person.email}</span>
                    </div>
                  )}
                  {person.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{person.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Current Balance */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Outstanding Balance</span>
                <CircleDollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{money(due, currency)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {due > 0 ? "Requires collection follow-up" : "All balances settled"}
              </p>
            </Card>

            {/* Tenancy History */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Units Occupied</span>
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold text-foreground">{history.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Across {estates.length} managed properties
              </p>
            </Card>
          </div>

          {/* Details Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Units & Occupancy */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Units & Tenancies</h2>
              </div>
              <div className="space-y-2">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No units on record.</p>
                ) : (
                  history.map((x) => (
                    <div
                      key={x.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground">
                          {units.find((u) => u.id === x.unit_id)?.identifier || "Unit"}
                        </span>
                        {x.start_date && (
                          <p className="text-[11px] text-muted-foreground">Since {x.start_date}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="capitalize text-[11px]">
                        {x.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Balances & Maintenance */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="h-4 w-4 text-primary" />
                <h2 className="font-semibold text-sm text-foreground">Recent Maintenance & Charges</h2>
              </div>
              <div className="space-y-2">
                {customerCharges.length === 0 && issues.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No recent records.</p>
                ) : (
                  <>
                    {customerCharges.slice(0, 4).map((x) => (
                      <div
                        key={x.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                      >
                        <span className="text-foreground">{x.description || x.type || "Charge"}</span>
                        <span className="font-semibold text-foreground">
                          {money(getChargeOutstandingMinor(x), x.currency || currency)}
                        </span>
                      </div>
                    ))}
                    {issues
                      .filter((x) => x.unit_id && unitIds.includes(x.unit_id))
                      .slice(0, 3)
                      .map((x) => (
                        <div
                          key={x.id}
                          className="flex items-center justify-between rounded-lg border border-border p-2.5 text-xs"
                        >
                          <span className="text-foreground truncate max-w-[200px]">{x.title}</span>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {x.status}
                          </Badge>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-12 text-center text-muted-foreground">
          <UserRound className="mx-auto mb-3 h-10 w-10 opacity-40 text-primary" />
          <p className="text-sm font-semibold text-foreground">No customer selected</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No occupied tenant or customer records are available in this organization yet.
          </p>
        </Card>
      )}
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
