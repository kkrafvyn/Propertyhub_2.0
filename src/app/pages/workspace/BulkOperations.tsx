import { Textarea } from "@/app/components/ui/textarea";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Layers,
  Send,
  Calendar,
  AlertCircle,
  Play,
  Loader2,
  History,
} from "lucide-react";
import { chargeGenerationService, type ChargeGenerationRun } from "../../../lib/charge-generation.service";
import { organizationService } from "../../../lib/organization.service";
import { supabase } from "../../../lib/supabase";
import { toast } from "sonner";
import { OperationalQueryState, WorkspacePageShell } from "../../components/ux";
import { Button } from "../../components/ui/Button";

const db = supabase as any;

export function BulkOperations({ organizationId: organizationIdProp }: { organizationId?: string }) {
  const { organizationSlug = "default" } = useParams();
  const [organizationId, setOrganizationId] = useState<string | null>(organizationIdProp || null);
  const [runningOp, setRunningOp] = useState<string | null>(null);
  const [history, setHistory] = useState<ChargeGenerationRun[]>([]);
  const [arrears, setArrears] = useState<{ count: number; totalMinor: number } | null>(null);
  const [broadcast, setBroadcast] = useState("");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (organizationIdProp) {
      setOrganizationId(organizationIdProp);
      return;
    }
    if (!organizationSlug || organizationSlug === "default") return;
    void organizationService
      .getOrganizationBySlug(organizationSlug)
      .then((org) => setOrganizationId(org?.id || null))
      .catch(() => undefined);
  }, [organizationIdProp, organizationSlug]);

  const loadHistory = async () => {
    if (!organizationId) return;
    try {
      setLoading(true);
      setLoadError(null);
      setHistory(await chargeGenerationService.getGenerationHistory(organizationId, 10));
    } catch (error) {
      console.error(error);
      const message = "Unable to load bulk operation history.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, [organizationId]);

  const runRentRoll = async () => {
    if (!organizationId) return;
    try {
      setRunningOp("rent-roll");
      const summary = await chargeGenerationService.runDueCharges({ organizationId });
      toast.success(
        `Rent roll complete: ${summary.totalGenerated} charge(s) generated, ${summary.totalSkipped} skipped across ${summary.estatesProcessed} estate(s).`
      );
      setHistory(await chargeGenerationService.getGenerationHistory(organizationId, 10));
    } catch (error) {
      console.error(error);
      toast.error("Rent roll run failed.");
    } finally {
      setRunningOp(null);
    }
  };

  const runArrearsScan = async () => {
    if (!organizationId) return;
    try {
      setRunningOp("arrears");
      const { data: estates } = await db
        .from("managed_estates")
        .select("id")
        .eq("organization_id", organizationId);
      const estateIds = ((estates || []) as any[]).map((e) => e.id);
      if (estateIds.length === 0) {
        setArrears({ count: 0, totalMinor: 0 });
        return;
      }
      const { data: units } = await db.from("estate_units").select("id").in("estate_id", estateIds);
      const unitIds = ((units || []) as any[]).map((u) => u.id);
      if (unitIds.length === 0) {
        setArrears({ count: 0, totalMinor: 0 });
        return;
      }
      const { data: charges } = await db
        .from("estate_charges")
        .select("amount_minor, status")
        .in("unit_id", unitIds)
        .eq("status", "overdue");
      const rows = (charges || []) as any[];
      const totalMinor = rows.reduce((sum, c) => sum + (Number(c.amount_minor) || 0), 0);
      setArrears({ count: rows.length, totalMinor });
      toast.success(`Arrears scan complete: ${rows.length} overdue charge(s) found.`);
    } catch (error) {
      console.error(error);
      toast.error("Arrears scan failed.");
    } finally {
      setRunningOp(null);
    }
  };

  const sendBroadcast = async () => {
    if (!organizationId || !broadcast.trim()) return;
    try {
      setRunningOp("broadcast");
      const { error } = await db.from("estate_automation_events").insert({
        organization_id: organizationId,
        event_type: "resident_broadcast",
        entity_type: "broadcast",
        payload: { message: broadcast.trim(), requested_at: new Date().toISOString() },
      });
      if (error) throw error;
      toast.success("Broadcast queued. Messages will be delivered to residents.");
      setBroadcast("");
      setShowBroadcast(false);
    } catch (error) {
      console.error(error);
      toast.error("Unable to queue broadcast.");
    } finally {
      setRunningOp(null);
    }
  };

  const queryPhase = loadError ? "error" : loading ? "loading" : "ready";

  return (
    <WorkspacePageShell
      tone="finance"
      title="Bulk Operations & Recurring Billing"
      description="Perform mass operations across all units, tenants, and ledger accounts in one click."
      badge={
        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">
          Batch Actions
        </span>
      }
      meta={<Layers className="h-5 w-5 text-emerald-500 dark:text-emerald-400" aria-hidden />}
      actions={
        organizationId ? (
          <Button variant="outline" size="sm" onClick={() => void loadHistory()} disabled={loading}>
            Refresh
          </Button>
        ) : null
      }
    >
      <OperationalQueryState
        phase={queryPhase}
        errorMessage={loadError || undefined}
        onRetry={() => void loadHistory()}
      >
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              Monthly Rent Roll & Recurring Charges
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Run all due recurring charge schedules across every estate. Automatically checks vacant units
            so charges are never duplicated for the same period.
          </p>
          <div className="pt-2 border-t border-border flex justify-end">
            <button
              onClick={() => void runRentRoll()}
              disabled={runningOp !== null || !organizationId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow disabled:opacity-50"
            >
              {runningOp === "rent-roll" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
              <span>Generate Rent Charges</span>
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Batch Arrears Assessment
            </h3>
            {arrears ? (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-amber-500 border border-border">
                {arrears.count} overdue · {(arrears.totalMinor / 100).toFixed(2)}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Scan all estate charge ledgers for overdue balances. Feed the results into Collections Cases and
            promise-to-pay follow-ups.
          </p>
          <div className="pt-2 border-t border-border flex justify-end">
            <button
              onClick={() => void runArrearsScan()}
              disabled={runningOp !== null || !organizationId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow disabled:opacity-50"
            >
              {runningOp === "arrears" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
              <span>Run Arrears Scan</span>
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Send className="h-4 w-4 text-sky-500" />
              Mass Resident Broadcast
            </h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send an important announcement (planned maintenance, repairs, or updates) to all estate residents.
            Messages are delivered via in-app notifications, SMS, and WhatsApp.
          </p>
          {showBroadcast ? (
            <div className="space-y-2">
              <Textarea
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                placeholder="Broadcast message to all residents…"
                value={broadcast}
                onChange={(e) => setBroadcast(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowBroadcast(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-border"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void sendBroadcast()}
                  disabled={runningOp !== null || !broadcast.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {runningOp === "broadcast" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                  Queue Broadcast
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-border flex justify-end">
              <button
                onClick={() => setShowBroadcast(true)}
                disabled={!organizationId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                <span>Compose Broadcast</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Recent Charge Generation Runs
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-muted-foreground">No batch runs recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs"
              >
                <span className="font-mono">{run.run_date}</span>
                <span className="text-emerald-500">{run.charges_generated} generated</span>
                <span className="text-muted-foreground">{run.charges_skipped} skipped</span>
                {run.errors ? <span className="text-red-500">{run.errors}</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
      </OperationalQueryState>
    </WorkspacePageShell>
  );
}
