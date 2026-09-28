import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Loader2, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/badge";
import {
  estateOperationsService,
  type EstateIssue,
  type ManagedEstate,
} from "../../../lib/estate-operations.service";
import { summarizeEstateLedger, type EstateChargeRow } from "../../../lib/estate-ledger";
import { supabase } from "../../../lib/supabase";

interface EstateAIOperationsProps {
  organizationId: string;
  currentUserId: string;
}

export function EstateAIOperations({ organizationId, currentUserId }: EstateAIOperationsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [estates, setEstates] = useState<ManagedEstate[]>([]);
  const [charges, setCharges] = useState<EstateChargeRow[]>([]);
  const [issues, setIssues] = useState<EstateIssue[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const load = async () => {
    try {
      setLoading(true);
      const es = await estateOperationsService.getEstates(organizationId);
      const us = await estateOperationsService.getUnits(es.map((x) => x.id));
      const [c, i, l] = await Promise.all([
        estateOperationsService.getCharges(us.map((x) => x.id)),
        estateOperationsService.getIssues(es.map((x) => x.id)),
        supabase
          .from("estate_ai_action_logs")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false }),
      ]);
      setEstates(es);
      setCharges(c);
      setIssues(i);
      setLogs(l.data || []);
    } catch {
      toast.error("Unable to load AI operations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const ledger = useMemo(() => summarizeEstateLedger(charges), [charges]);

  const recommendations = useMemo(
    () => [
      {
        agent: "finance",
        risk: "medium",
        text: ledger.overdueMinor
          ? `Prioritize collection follow-up for ${(ledger.overdueMinor / 100).toLocaleString()} in overdue balances.`
          : "No overdue collections recommendation today.",
      },
      {
        agent: "maintenance",
        risk: "low",
        text: issues.filter(
          (x) => x.priority === "urgent" && !["resolved", "closed"].includes(x.status),
        ).length
          ? `${
              issues.filter(
                (x) => x.priority === "urgent" && !["resolved", "closed"].includes(x.status),
              ).length
            } urgent issue(s) need supervisor escalation.`
          : "No urgent maintenance escalation today.",
      },
      {
        agent: "operations",
        risk: "low",
        text: `Review ${
          issues.filter((x) => !["resolved", "closed"].includes(x.status)).length
        } open issue(s) in today's operations huddle.`,
      },
    ],
    [ledger, issues],
  );

  const record = async (rec: any) => {
    try {
      setSaving(true);
      const { error } = await supabase.from("estate_ai_action_logs").insert({
        organization_id: organizationId,
        agent_type: rec.agent,
        risk_level: rec.risk,
        trigger_type: "daily_briefing",
        recommendation: rec.text,
        requested_by: currentUserId,
      });
      if (error) throw error;
      toast.success("AI recommendation recorded for team review.");
      await load();
    } catch {
      toast.error("Unable to record recommendation.");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("estate_ai_action_logs")
        .update({
          action_status: status,
          approved_by: currentUserId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success(status === "approved" ? "Recommendation approved." : "Recommendation rejected.");
      await load();
    } catch {
      toast.error("Unable to update approval.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Preparing daily briefing…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">AI Operations Briefing</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Automated summaries and operational suggestions to help your team prioritize tasks.
        </p>
      </div>

      {/* Recommendations Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recommended Priorities for Today</h2>
            <p className="text-[11px] text-muted-foreground">
              Based on active tenant balances, open work tickets, and estate schedule.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-border p-3.5 bg-card/50"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={rec.risk === "medium" ? "destructive" : "outline"}
                    className="capitalize text-[10px]"
                  >
                    {rec.agent}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {rec.risk} priority
                  </span>
                </div>
                <p className="text-xs text-foreground font-medium">{rec.text}</p>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void record(rec)}
                className="shrink-0 text-xs h-8"
              >
                Send to Team Review
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Approval & Action Log */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Team Review & Approvals</h2>
            <p className="text-[11px] text-muted-foreground">
              Audit log of suggested actions approved or dismissed by managers.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">
              No recommendations submitted for review yet.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border p-3 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-foreground">{log.recommendation}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {log.agent_type} · {new Date(log.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {log.action_status || "Pending"}
                  </Badge>

                  {(!log.action_status || log.action_status === "recommended") && (
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        disabled={saving}
                        onClick={() => void decide(log.id, "approved")}
                        className="h-7 text-xs px-2.5 gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => void decide(log.id, "rejected")}
                        className="h-7 text-xs px-2.5 gap-1 text-destructive"
                      >
                        <XCircle className="h-3 w-3" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
