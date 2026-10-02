import { NativeSelectControl } from "@/app/components/ui/NativeSelect";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import {
  Workflow,
  Plus,
  Zap,
  ArrowRight,
  Play,
  CheckCircle2,
  PauseCircle,
  Loader2,
} from "lucide-react";
import { automationEngineService } from "../../../lib/automation-engine.service";
import { organizationService } from "../../../lib/organization.service";
import { toast } from "sonner";

interface WorkflowRow {
  id: string;
  name: string;
  workflow_type: string;
  trigger_type: string;
  actions: Record<string, any>;
  enabled: boolean;
  execution_count: number | null;
  last_executed_at: string | null;
}

const TRIGGER_OPTIONS = [
  { value: "payment_received", label: "Payment received" },
  { value: "maintenance_sla_breach", label: "Maintenance SLA breach" },
  { value: "lease_expiring", label: "Lease expiring soon" },
  { value: "charge_overdue", label: "Charge overdue" },
  { value: "new_application", label: "New lease application" },
];

const ACTION_OPTIONS = [
  { value: "send_notification", label: "Send in-app notification" },
  { value: "queue_sms", label: "Queue SMS (provider-delivered)" },
  { value: "queue_email", label: "Queue email (provider-delivered)" },
  { value: "create_task", label: "Create follow-up task" },
  { value: "escalate", label: "Escalate to manager" },
];

export function AutomationBuilder({ organizationId: organizationIdProp }: { organizationId?: string }) {
  const { organizationSlug = "default" } = useParams();
  const [organizationId, setOrganizationId] = useState<string | null>(organizationIdProp || null);
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    trigger: TRIGGER_OPTIONS[0].value,
    action: ACTION_OPTIONS[0].value,
    message: "",
  });

  useEffect(() => {
    if (organizationIdProp) {
      setOrganizationId(organizationIdProp);
      return;
    }
    if (!organizationSlug || organizationSlug === "default") {
      setLoading(false);
      return;
    }
    void organizationService
      .getOrganizationBySlug(organizationSlug)
      .then((org) => setOrganizationId(org?.id || null))
      .catch(() => setLoading(false));
  }, [organizationIdProp, organizationSlug]);

  const load = async (orgId: string) => {
    try {
      setLoading(true);
      const rows = await automationEngineService.getWorkflows(orgId);
      setWorkflows((rows || []) as WorkflowRow[]);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load automation rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) void load(organizationId);
  }, [organizationId]);

  const createRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!organizationId || !form.name.trim()) return;
    try {
      setSaving(true);
      await automationEngineService.createWorkflow(
        organizationId,
        form.name.trim(),
        "custom",
        form.trigger,
        {},
        { type: form.action, message: form.message.trim() || undefined }
      );
      toast.success("Automation rule created.");
      setForm({ name: "", trigger: TRIGGER_OPTIONS[0].value, action: ACTION_OPTIONS[0].value, message: "" });
      setShowForm(false);
      await load(organizationId);
    } catch (error) {
      console.error(error);
      toast.error("Unable to create rule.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: WorkflowRow) => {
    if (!organizationId) return;
    try {
      await automationEngineService.setWorkflowEnabled(rule.id, !rule.enabled);
      await load(organizationId);
    } catch (error) {
      console.error(error);
      toast.error("Unable to update rule.");
    }
  };

  const runRule = async (rule: WorkflowRow) => {
    if (!organizationId) return;
    try {
      setRunningId(rule.id);
      await automationEngineService.executeWorkflow(rule.id, organizationId);
      toast.success(`Rule "${rule.name}" executed.`);
      await load(organizationId);
    } catch (error) {
      console.error(error);
      toast.error("Rule execution failed.");
    } finally {
      setRunningId(null);
    }
  };

  const triggerLabel = (value: string) =>
    TRIGGER_OPTIONS.find((t) => t.value === value)?.label || value.replace(/_/g, " ");

  const actionLabel = (actions: Record<string, any>) => {
    const type = actions?.type || Object.keys(actions || {})[0];
    return ACTION_OPTIONS.find((a) => a.value === type)?.label || String(type || "Custom action");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">
              Visual Automation Engine & Workflow Builder
            </h1>
            <span className="bg-emerald-950 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-800">
              Low-Code REOS Rules
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Construct event-driven escalations, automated tenant notifications, and automated accounting postings.
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition shadow"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Workflow Rule</span>
        </button>
      </div>

      {showForm ? (
        <form onSubmit={createRule} className="bg-card border border-border rounded-xl p-4 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Rule name (e.g. Notify on overdue rent)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <NativeSelectControl
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={form.trigger}
            onChange={(e) => setForm({ ...form, trigger: e.target.value })}
          >
            {TRIGGER_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                Trigger: {t.label}
              </option>
            ))}
          </NativeSelectControl>
          <NativeSelectControl
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
          >
            {ACTION_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                Action: {a.label}
              </option>
            ))}
          </NativeSelectControl>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Optional message template"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-border"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create Rule"}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading automation rules…
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          No automation rules yet. Create your first event-driven rule to automate notifications, escalations, and
          follow-ups.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((r) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-4 space-y-3 shadow">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-400 font-bold">{r.name}</span>
                <button
                  onClick={() => void toggleRule(r)}
                  className={`inline-flex items-center gap-1 text-[11px] ${
                    r.enabled ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {r.enabled ? <CheckCircle2 className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
                  {r.enabled ? "Active" : "Paused"}
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="bg-secondary p-2.5 rounded-lg border border-border flex items-center gap-2 text-foreground">
                  <Zap className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>Trigger:</strong> {triggerLabel(r.trigger_type)}
                  </span>
                </div>
                <div className="flex justify-center">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 rotate-90" />
                </div>
                <div className="bg-secondary p-2.5 rounded-lg border border-border flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                  <Play className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Action:</strong> {actionLabel(r.actions)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
                <span>
                  {r.execution_count || 0} runs
                  {r.last_executed_at ? ` · last ${new Date(r.last_executed_at).toLocaleDateString()}` : ""}
                </span>
                <button
                  onClick={() => void runRule(r)}
                  disabled={runningId === r.id || !r.enabled}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
                >
                  {runningId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Run now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
