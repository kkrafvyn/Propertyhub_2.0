import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import {
  Cpu,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  Bot,
  RefreshCw,
  Send,
  Check,
  X,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  FileText,
  DollarSign,
  Wrench,
  Gauge,
  Scale,
  Users,
  Briefcase,
  Layers,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import {
  agenticAIOrchestratorService,
  type AgentType,
  type RiskLevel,
  type AIActionLedgerEntry,
  type NightWatchReport,
} from "../../../lib/agentic-ai-orchestrator.service";
import { organizationService } from "../../../lib/organization.service";
import { aiToolAllowlistService } from "../../../lib/ai-tool-allowlist.service";

const AGENT_CATALOG: Array<{ type: AgentType; label: string; icon: React.ElementType; color: string; description: string }> = [
  { type: "ExecutiveAgent", label: "Executive Agent", icon: TrendingUp, color: "text-amber-500", description: "Portfolio morning briefing, yield analytics & risk synthesis" },
  { type: "PropertyManagementAgent", label: "Property Management", icon: Briefcase, color: "text-blue-500", description: "Vacancies, lease turnover, SLA breach monitoring" },
  { type: "FinanceAgent", label: "Finance & Reconciliation", icon: DollarSign, color: "text-emerald-500", description: "Sub-ledger balancing, unreferenced credit matching" },
  { type: "CollectionsAgent", label: "Arrears & Collections", icon: AlertTriangle, color: "text-rose-500", description: "Tenant risk scoring, promise tracking, notice drafting" },
  { type: "LeasingAgent", label: "Leasing & Act 220", icon: Scale, color: "text-indigo-500", description: "Ghana Card verification, 6-month rent cap audits" },
  { type: "MaintenanceAgent", label: "Maintenance & Triage", icon: Wrench, color: "text-amber-500", description: "Defect classification, duplicate detection, dispatching" },
  { type: "ContractorAgent", label: "Contractor Network", icon: Users, color: "text-cyan-500", description: "Multi-vendor RFQ matching & quote comparison matrix" },
  { type: "UtilityAgent", label: "Utility & Sub-Metering", icon: Gauge, color: "text-purple-500", description: "ECG/GWCL tariff calculation & leakage anomaly alerts" },
  { type: "CustomerServiceAgent", label: "Service Desk AI", icon: Bot, color: "text-teal-500", description: "24/7 resident FAQ intake, ticket creation & routing" },
  { type: "InspectionAgent", label: "Inspection AI", icon: FileText, color: "text-orange-500", description: "150-point move-in/out checklist diffing & wear assessment" },
];

export function AICommandCenter({ organizationId: organizationIdProp }: { organizationId?: string }) {
  const { organizationSlug = "default" } = useParams();
  const [resolvedOrganizationId, setResolvedOrganizationId] = useState(organizationIdProp || "");
  const [nightWatchActive, setNightWatchActive] = useState(true);
  const [ledgerEntries, setLedgerEntries] = useState<AIActionLedgerEntry[]>([]);
  const [nightWatchReport, setNightWatchReport] = useState<NightWatchReport | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("ExecutiveAgent");
  const [goalPrompt, setGoalPrompt] = useState("");
  const [executingGoal, setExecutingGoal] = useState(false);
  const [filterTier, setFilterTier] = useState<string>("ALL");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [runningNightWatch, setRunningNightWatch] = useState(false);
  const [aiGloballyEnabled, setAiGloballyEnabled] = useState(true);

  const organizationId = resolvedOrganizationId || organizationIdProp || organizationSlug;

  useEffect(() => {
    if (organizationIdProp) {
      setResolvedOrganizationId(organizationIdProp);
      return;
    }
    if (!organizationSlug || organizationSlug === "default") return;
    void organizationService
      .getOrganizationBySlug(organizationSlug)
      .then((org) => {
        if (org?.id) setResolvedOrganizationId(org.id);
      })
      .catch(() => undefined);
  }, [organizationIdProp, organizationSlug]);

  const loadState = async () => {
    const orgKey = resolvedOrganizationId || organizationIdProp || organizationSlug;
    try {
      const report = await agenticAIOrchestratorService.runNightWatchAuditLive(orgKey);
      setNightWatchReport(report);
      const ledger = await agenticAIOrchestratorService.getLedgerEntriesLive(orgKey);
      setLedgerEntries(ledger.length ? ledger : agenticAIOrchestratorService.getLedgerEntries(orgKey));
      const orgId = resolvedOrganizationId || organizationIdProp;
      if (orgId) {
        const control = await aiToolAllowlistService.getOrgControl(orgId);
        setAiGloballyEnabled(control?.globally_enabled !== false);
      }
    } catch {
      setNightWatchReport(agenticAIOrchestratorService.getLatestNightWatchReport(orgKey));
      setLedgerEntries(agenticAIOrchestratorService.getLedgerEntries(orgKey));
    }
  };

  useEffect(() => {
    void loadState();
  }, [resolvedOrganizationId, organizationIdProp, organizationSlug]);

  const handleApprove = async (actionId: string) => {
    try {
      await agenticAIOrchestratorService.resolveApprovalLive(
        actionId,
        "approve",
        undefined,
        "Approved via AI Command Center"
      );
      void loadState();
      setActionSuccessMsg("Action successfully approved and dispatched to workers.");
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReject = async (actionId: string) => {
    try {
      await agenticAIOrchestratorService.resolveApprovalLive(
        actionId,
        "reject",
        undefined,
        "Rejected by operator discretion"
      );
      void loadState();
      setActionSuccessMsg("Action declined and removed from execution queue.");
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRunNightWatch = async () => {
    setRunningNightWatch(true);
    try {
      const orgKey = resolvedOrganizationId || organizationIdProp || organizationSlug;
      const freshReport = await agenticAIOrchestratorService.runNightWatchAuditLive(orgKey);
      setNightWatchReport(freshReport);
      const ledger = await agenticAIOrchestratorService.getLedgerEntriesLive(orgKey);
      setLedgerEntries(ledger.length ? ledger : agenticAIOrchestratorService.getLedgerEntries(orgKey));
      setActionSuccessMsg("AI Night Watch completed full portfolio scan.");
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setRunningNightWatch(false);
    }
  };

  const handleDispatchAgentGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalPrompt.trim()) return;

    setExecutingGoal(true);
    try {
      const orgKey = resolvedOrganizationId || organizationIdProp || organizationSlug;
      await agenticAIOrchestratorService.executeAgentGoal(
        selectedAgent,
        goalPrompt,
        orgKey
      );
      setGoalPrompt("");
      void loadState();
      setActionSuccessMsg(`Agent ${selectedAgent} completed task analysis and logged action.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } finally {
      setExecutingGoal(false);
    }
  };

  const pendingApprovals = ledgerEntries.filter((e) => e.approvalStatus === "pending_approval");

  const filteredLedger = ledgerEntries.filter((item) => {
    if (filterTier === "PENDING") return item.approvalStatus === "pending_approval";
    if (filterTier === "LEVEL_0") return item.riskLevel === "LEVEL_0";
    if (filterTier === "LEVEL_1") return item.riskLevel === "LEVEL_1";
    if (filterTier === "LEVEL_2") return item.riskLevel === "LEVEL_2";
    if (filterTier === "LEVEL_3") return item.riskLevel === "LEVEL_3";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Status Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-surface border border-surface-border shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-ink tracking-tight">
                  AI Command Center & Autonomous Fleet
                </h1>
                <Badge variant="outline" className="text-[11px] border-primary/30 text-primary bg-primary/5">
                  15 Active Agents
                </Badge>
              </div>
              <p className="text-xs text-ink-secondary mt-0.5">
                4-Tier risk governance, autonomous Night Watch audits, and human-in-the-loop approval queues.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleRunNightWatch()}
            disabled={runningNightWatch}
            className="gap-1.5 text-xs border-surface-border text-ink bg-surface hover:bg-surface-hover"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Run Night Watch Now
          </Button>

          <button
            onClick={() => setNightWatchActive(!nightWatchActive)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              nightWatchActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-surface-subtle text-ink-secondary border-surface-border"
            }`}
          >
            {nightWatchActive ? <Play className="h-3 w-3 fill-current" /> : <Pause className="h-3 w-3" />}
            <span>Night Watch: {nightWatchActive ? "ACTIVE (24/7)" : "PAUSED"}</span>
          </button>
          <button
            onClick={() => {
              const orgId = resolvedOrganizationId || organizationIdProp;
              if (!orgId) return;
              const next = !aiGloballyEnabled;
              void aiToolAllowlistService.setGlobalKillSwitch(orgId, next).then(() => {
                setAiGloballyEnabled(next);
                setActionSuccessMsg(next ? "AI globally enabled." : "Global AI kill switch engaged.");
                setTimeout(() => setActionSuccessMsg(null), 4000);
              });
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              aiGloballyEnabled
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
            }`}
          >
            <ShieldAlert className="h-3 w-3" />
            <span>AI: {aiGloballyEnabled ? "ENABLED" : "KILLED"}</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* AI Night Watch Morning Briefing Card */}
      {nightWatchReport && (
        <Card className="p-6 border-surface-border bg-surface shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">AI Night Watch — Morning Operational Briefing</h2>
                <p className="text-xs text-ink-secondary">
                  Last automated audit scanned {nightWatchReport.leasesScanned} leases, {nightWatchReport.receivablesScanned} invoices, and {nightWatchReport.maintenanceScanned} work orders.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-secondary">Portfolio Risk Score:</span>
              <Badge className={`text-xs ${nightWatchReport.riskScore < 30 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                {nightWatchReport.riskScore}/100 ({nightWatchReport.riskScore < 30 ? "Low Risk" : "Moderate"})
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {nightWatchReport.briefingItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  item.severity === "critical"
                    ? "bg-rose-500/5 border-rose-500/20"
                    : item.severity === "warning"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-surface-subtle border-surface-border"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase font-bold ${
                        item.severity === "critical"
                          ? "border-rose-500/30 text-rose-500"
                          : item.severity === "warning"
                          ? "border-amber-500/30 text-amber-500"
                          : "border-primary/30 text-primary"
                      }`}
                    >
                      {item.category}
                    </Badge>
                    <span className="text-[10px] text-ink-muted">{item.riskLevel}</span>
                  </div>
                  <h3 className="text-xs font-bold text-ink leading-snug">{item.title}</h3>
                  <p className="text-[11px] text-ink-secondary mt-1.5 leading-relaxed">{item.evidence}</p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-surface-border flex items-center justify-between">
                  <span className="text-[11px] text-ink-muted font-medium truncate max-w-[170px]">
                    {item.recommendation}
                  </span>
                  <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20 shrink-0">
                    {item.suggestedAction}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Level 2 Human Approval Queue */}
      <div className="p-6 rounded-2xl bg-surface border border-amber-500/30 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-ink">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>Level 2 Human Approval Queue ({pendingApprovals.length} Pending)</span>
          </div>
          <span className="text-xs text-ink-muted">Human-in-the-Loop Governance</span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-surface-subtle border border-surface-border text-xs text-ink-muted">
            All autonomous high-value actions have been reviewed and approved. Zero pending items.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-xl bg-surface-subtle border border-surface-border space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-primary font-bold">{app.id}</span>
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
                    {app.agent} · {app.riskLevel}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs font-bold text-ink">{app.targetEntity}</p>
                  <p className="text-xs text-ink-secondary mt-1">{app.reasoning}</p>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-surface-border">
                  <span className="text-[11px] text-ink-muted font-mono">{app.actionType}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleReject(app.id)}
                      className="h-7 px-2.5 text-xs text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
                    >
                      <X className="w-3.5 h-3.5 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleApprove(app.id)}
                      className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fleet Dispatch Studio */}
      <Card className="p-6 border-surface-border bg-surface shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-ink">Specialized Fleet Dispatcher</h2>
            <p className="text-xs text-ink-secondary">Select a specialized agent to execute targeted operational goals.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {AGENT_CATALOG.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedAgent === item.type;
            return (
              <button
                key={item.type}
                onClick={() => setSelectedAgent(item.type)}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                    : "bg-surface-subtle border-surface-border hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  {isSelected && <span className="w-2 h-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-ink truncate">{item.label}</p>
                  <p className="text-[10px] text-ink-muted truncate mt-0.5">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleDispatchAgentGoal} className="flex gap-2">
          <input
            type="text"
            value={goalPrompt}
            onChange={(e) => setGoalPrompt(e.target.value)}
            placeholder={`Instruct ${selectedAgent} (e.g. "Audit all 6-month rent advance caps in Cantonments")...`}
            className="flex-1 px-4 py-2 text-xs rounded-xl bg-surface-subtle border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            disabled={executingGoal || !goalPrompt.trim()}
            className="text-xs gap-1.5 bg-primary text-primary-foreground"
          >
            {executingGoal ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Dispatch Goal
          </Button>
        </form>
      </Card>

      {/* Live AI Action Ledger ("What did AI do today?") */}
      <Card className="p-6 border-surface-border bg-surface shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-surface-border">
          <div>
            <h2 className="text-base font-bold text-ink">AI Action Ledger ("What Did AI Do Today?")</h2>
            <p className="text-xs text-ink-secondary">Real-time immutable audit trail of all autonomous executions and decisions.</p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {["ALL", "PENDING", "LEVEL_0", "LEVEL_1", "LEVEL_2"].map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  filterTier === tier
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-subtle text-ink-secondary hover:text-ink"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-ink-secondary font-semibold border-b border-surface-border">
              <tr>
                <th className="p-3">Agent</th>
                <th className="p-3">Risk Level</th>
                <th className="p-3">Target & Reasoning</th>
                <th className="p-3">Execution Status</th>
                <th className="p-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredLedger.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-hover transition">
                  <td className="p-3 font-semibold text-ink">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                      <span>{entry.agent}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        entry.riskLevel === "LEVEL_0"
                          ? "border-blue-500/30 text-blue-500"
                          : entry.riskLevel === "LEVEL_1"
                          ? "border-emerald-500/30 text-emerald-500"
                          : entry.riskLevel === "LEVEL_2"
                          ? "border-amber-500/30 text-amber-500"
                          : "border-rose-500/30 text-rose-500"
                      }`}
                    >
                      {entry.riskLevel}
                    </Badge>
                  </td>

                  <td className="p-3">
                    <p className="font-medium text-ink">{entry.targetEntity}</p>
                    <p className="text-[11px] text-ink-secondary mt-0.5">{entry.reasoning}</p>
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium capitalize ${
                        entry.approvalStatus === "approved" || entry.approvalStatus === "executed" || entry.approvalStatus === "auto_approved"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : entry.approvalStatus === "rejected"
                          ? "text-rose-500"
                          : "text-amber-500"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${entry.approvalStatus === "pending_approval" ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                      {entry.approvalStatus.replace("_", " ")}
                    </span>
                  </td>

                  <td className="p-3 text-right text-ink-muted font-mono text-[11px]">
                    {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
