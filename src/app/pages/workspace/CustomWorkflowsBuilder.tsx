import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import { MetricCard } from '../../components/ui/MetricCard';
import { automationEngineService } from '../../../lib/automation-engine.service';
import type { MemberRole } from '../../../lib/workspace';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  Edit,
  Zap,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Grid,
  Copy,
  Eye,
  BarChart3,
  FileText,
  Edit3,
  Handshake,
  MessageSquare,
  DollarSign,
  Mail,
  Smartphone,
  CheckSquare,
  RefreshCw,
  Bell,
  Webhook,
  MapPin,
  Building,
  User,
  Target,
  Sliders,
  Sparkles,
  X,
  Check,
  Activity,
  TrendingUp,
  Search,
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  name: string;
  config: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'draft';
  steps: WorkflowStep[];
  createdAt: Date;
  runs: number;
  lastRun?: Date;
  successRate: number;
}

const availableTriggers = [
  { id: 'new_listing', label: 'New Listing Created', icon: FileText },
  { id: 'property_updated', label: 'Property Updated', icon: Edit3 },
  { id: 'deal_created', label: 'Deal Created', icon: Handshake },
  { id: 'message_received', label: 'Message Received', icon: MessageSquare },
  { id: 'price_change', label: 'Price Changed', icon: DollarSign },
];

const availableActions = [
  { id: 'send_email', label: 'Send Email', icon: Mail },
  { id: 'send_sms', label: 'Send SMS', icon: Smartphone },
  { id: 'create_task', label: 'Create Task', icon: CheckSquare },
  { id: 'update_field', label: 'Update Field', icon: RefreshCw },
  { id: 'create_notification', label: 'Create Notification', icon: Bell },
  { id: 'webhook', label: 'Call Webhook', icon: Webhook },
];

const availableConditions = [
  { id: 'price_range', label: 'Price Range', icon: DollarSign },
  { id: 'location', label: 'Location Match', icon: MapPin },
  { id: 'property_type', label: 'Property Type', icon: Building },
  { id: 'time', label: 'Time-based', icon: Clock },
  { id: 'user_role', label: 'User Role', icon: User },
];

interface CustomWorkflowsBuilderProps {
  organizationId: string;
  currentRole: MemberRole | null;
}

function mapWorkflowRecord(record: any, stats: { runs: number; successRate: number; lastRun?: string | null }) {
  const actions = record.actions || {};
  const actionSteps = Object.entries(actions).map(([key, value], index) => ({
    id: `action-${index + 1}`,
    type: 'action' as const,
    name: key.replace(/_/g, ' '),
    config: (value as Record<string, any>) || {},
  }));

  return {
    id: record.id,
    name: record.name,
    description: record.workflow_type || 'Custom automation workflow',
    status: record.enabled ? ('active' as const) : ('inactive' as const),
    steps: [
      {
        id: 'trigger-1',
        type: 'trigger' as const,
        name: String(record.trigger_type || 'trigger').replace(/_/g, ' '),
        config: record.conditions || {},
      },
      ...actionSteps,
    ],
    createdAt: new Date(record.created_at),
    runs: stats.runs,
    lastRun: stats.lastRun ? new Date(stats.lastRun) : undefined,
    successRate: stats.successRate,
  };
}

export default function CustomWorkflowsBuilder({
  organizationId,
  currentRole,
}: CustomWorkflowsBuilderProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const canManageWorkflows = currentRole === 'owner' || currentRole === 'manager';

  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState('new_listing');
  const [searchQuery, setSearchQuery] = useState('');

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const summaries = await automationEngineService.getWorkflowSummaries(organizationId);
      setWorkflows(
        summaries.map(({ workflow, stats }) => mapWorkflowRecord(workflow, stats))
      );
    } catch (error) {
      console.error('Failed to load workflows:', error);
      toast.error('We could not load workflows right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkflows();
  }, [organizationId]);

  const toggleWorkflowStatus = async (id: string) => {
    const workflow = workflows.find((item) => item.id === id);
    if (!workflow || !canManageWorkflows) return;

    try {
      await automationEngineService.toggleWorkflow(id, workflow.status !== 'active');
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      toast.error('We could not update that workflow.');
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!canManageWorkflows) return;

    try {
      await automationEngineService.deleteWorkflow(id);
      toast.success('Workflow deleted.');
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      toast.error('We could not delete that workflow.');
    }
  };

  const createNewWorkflow = async () => {
    if (!newWorkflowName || !canManageWorkflows) return;

    try {
      await automationEngineService.createCustomWorkflow(
        organizationId,
        newWorkflowName.trim(),
        selectedTrigger
      );
      setNewWorkflowName('');
      setShowBuilder(false);
      toast.success('Workflow created.');
      await loadWorkflows();
    } catch (error) {
      console.error('Failed to create workflow:', error);
      toast.error('We could not create that workflow.');
    }
  };

  /* ── Derived telemetry ─────────────────────────────────────── */
  const activePipelines = workflows.filter(w => w.status === 'active').length;
  const totalExecutions = workflows.reduce((s, w) => s + w.runs, 0);
  const avgSuccessRate =
    workflows.length > 0
      ? Math.round(workflows.reduce((s, w) => s + w.successRate, 0) / workflows.length)
      : 0;
  const webhookTriggers = workflows.reduce(
    (s, w) => s + w.steps.filter(st => st.type === 'trigger').length,
    0
  );

  /* ── Filtered list ─────────────────────────────────────────── */
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) return workflows;
    const q = searchQuery.toLowerCase();
    return workflows.filter(
      w =>
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q)
    );
  }, [workflows, searchQuery]);

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 flex items-center justify-center animate-pulse">
          <Zap className="w-7 h-7 text-emerald-500" />
        </div>
        <p className="text-sm text-ink-muted font-medium">Initialising automation engine…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ═══════════════════════════════════════════════════════════
          EDITORIAL HERO HEADER
       ═══════════════════════════════════════════════════════════ */}
      <section className="relative rounded-3xl overflow-hidden border border-emerald-500/20 bg-surface/80 backdrop-blur-xl p-8 sm:p-10">
        {/* Ambient dual orbs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-amber-500/12 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-ink"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Custom Workflows
                </h1>
                <Badge variant="success" dot pulse>Engine Active</Badge>
              </div>
              <p className="text-sm text-ink-muted mt-1.5 max-w-lg">
                Autonomous event-driven automation pipelines — zero-code orchestration for leads, deals, and notifications
              </p>
            </div>
          </div>

          <Button
            onClick={() => setShowBuilder(!showBuilder)}
            disabled={!canManageWorkflows}
            variant={showBuilder ? 'outline' : 'gradient'}
            className="flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-500/15"
          >
            {showBuilder ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showBuilder ? 'Close Builder' : 'Create Pipeline'}
          </Button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          TELEMETRY METRIC CARDS
       ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Pipelines"
          value={activePipelines}
          icon={Activity}
          glow="emerald"
        />
        <MetricCard
          title="Total Executions"
          value={totalExecutions.toLocaleString()}
          icon={Sparkles}
          glow="primary"
        />
        <MetricCard
          title="Avg Success Rate"
          value={`${avgSuccessRate}%`}
          icon={TrendingUp}
          glow="amber"
        />
        <MetricCard
          title="Event Triggers"
          value={webhookTriggers}
          icon={Webhook}
          glow="purple"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════
          PIPELINE BUILDER PANEL
       ═══════════════════════════════════════════════════════════ */}
      {showBuilder && (
        <Card variant="glass" className="p-7 sm:p-9 border-emerald-500/30 shadow-2xl relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/8 rounded-full blur-[60px] pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3
                  className="text-xl font-bold text-ink"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Design New Automation Pipeline
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">Configure your event trigger and pipeline logic</p>
              </div>
            </div>

            <div className="space-y-7">
              {/* Pipeline name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2.5">
                  Pipeline Name
                </label>
                <Input
                  placeholder="e.g. VIP Lead Auto-Nurture & SMS Alert"
                  value={newWorkflowName}
                  onChange={e => setNewWorkflowName(e.target.value)}
                  className="bg-surface/80 border-surface-border text-ink focus:border-emerald-500 focus:ring-emerald-500/20 rounded-xl h-12"
                />
              </div>

              {/* Trigger selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
                  Select Ingestion Trigger
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {availableTriggers.map((trigger) => {
                    const Icon = trigger.icon;
                    const isSelected = selectedTrigger === trigger.id;
                    return (
                      <button
                        key={trigger.id}
                        type="button"
                        onClick={() => setSelectedTrigger(trigger.id)}
                        className={`group relative rounded-xl border p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30'
                            : 'border-surface-border bg-surface/60 hover:bg-surface hover:border-emerald-500/30 hover:shadow-sm text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                            isSelected
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                              : 'bg-surface-subtle text-ink-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:bg-emerald-500/10'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold truncate">{trigger.label}</span>
                            <span className="block text-[11px] text-ink-muted truncate">Event trigger</span>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deploy action bar */}
              <div className="flex items-center gap-3 pt-5 border-t border-surface-border">
                <Button
                  onClick={createNewWorkflow}
                  disabled={!newWorkflowName.trim()}
                  variant="gradient"
                  className="flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Deploy Pipeline
                </Button>
                <Button
                  onClick={() => setShowBuilder(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LIVE SEARCH BAR
       ═══════════════════════════════════════════════════════════ */}
      {workflows.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" />
          <Input
            placeholder="Search pipelines by name or description…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-11 pr-10 h-12 rounded-xl bg-surface/80 backdrop-blur-sm border-surface-border focus:border-emerald-500 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-subtle hover:bg-surface-border text-ink-muted hover:text-ink flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          WORKFLOWS LIST / EMPTY STATE
       ═══════════════════════════════════════════════════════════ */}
      {filteredWorkflows.length === 0 && !searchQuery ? (
        <Card variant="glass" className="p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-amber-500/5 pointer-events-none" />
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Zap className="w-10 h-10 animate-pulse" />
            </div>
            <h3
              className="text-2xl font-bold mb-2 text-ink"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              No Active Pipelines
            </h3>
            <p className="text-ink-muted text-sm max-w-md mx-auto mb-7">
              Create automated workflows to handle lead assignments, instant client messaging, and listing price alerts automatically.
            </p>
            <Button
              onClick={() => setShowBuilder(true)}
              variant="gradient"
              className="flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4" />
              Build Your First Pipeline
            </Button>
          </div>
        </Card>
      ) : filteredWorkflows.length === 0 && searchQuery ? (
        <Card variant="glass" className="p-10 text-center">
          <Search className="w-8 h-8 mx-auto mb-3 text-ink-muted opacity-50" />
          <p className="text-sm text-ink-muted">No pipelines match &ldquo;{searchQuery}&rdquo;</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredWorkflows.map(workflow => (
            <Card
              key={workflow.id}
              variant="glass"
              className="p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/5 cursor-pointer group relative overflow-hidden flex flex-col justify-between"
              onClick={() => setSelectedWorkflow(workflow)}
            >
              {/* Hover glow accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/0 group-hover:bg-emerald-500/8 rounded-full blur-2xl transition-all duration-500 pointer-events-none" />

              <div className="relative">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-ink group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {workflow.name}
                      </h3>
                      <Badge
                        variant={
                          workflow.status === 'active'
                            ? 'success'
                            : workflow.status === 'draft'
                              ? 'warning'
                              : 'outline'
                        }
                        dot
                        pulse={workflow.status === 'active'}
                      >
                        {workflow.status === 'active' && 'Active'}
                        {workflow.status === 'draft' && 'Draft'}
                        {workflow.status === 'inactive' && 'Paused'}
                      </Badge>
                    </div>
                    <p className="text-ink-muted text-xs sm:text-sm mt-1 line-clamp-1">{workflow.description}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      onClick={e => {
                        e.stopPropagation();
                        toggleWorkflowStatus(workflow.id);
                      }}
                      size="sm"
                      variant="glass"
                      className={`h-8 w-8 p-0 rounded-lg ${
                        workflow.status === 'active'
                          ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={workflow.status === 'active' ? 'Pause Pipeline' : 'Activate Pipeline'}
                    >
                      {workflow.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button
                      onClick={e => {
                        e.stopPropagation();
                        deleteWorkflow(workflow.id);
                      }}
                      size="sm"
                      variant="glass"
                      className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      title="Delete Pipeline"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Pipeline Sequence Nodes */}
                <div className="mb-5 p-4 bg-surface-subtle/70 rounded-xl border border-surface-border">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Grid className="w-3 h-3" />
                      Execution Sequence
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">{workflow.steps.length} Steps</span>
                  </div>
                  <div className="space-y-2">
                    {workflow.steps.map((step, idx) => (
                      <div key={step.id}>
                        <div
                          className={`px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between border transition-all ${
                            step.type === 'trigger'
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
                              : step.type === 'condition'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              step.type === 'trigger'
                                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                : step.type === 'condition'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {step.type === 'trigger' && <Target className="w-3 h-3" />}
                              {step.type === 'condition' && <Sliders className="w-3 h-3" />}
                              {step.type === 'action' && <Sparkles className="w-3 h-3" />}
                            </div>
                            <span className="capitalize truncate">{step.name}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 shrink-0 ml-2">
                            {step.type}
                          </span>
                        </div>
                        {idx < workflow.steps.length - 1 && (
                          <div className="flex justify-center py-1">
                            <div className="w-0.5 h-4 bg-gradient-to-b from-emerald-500/40 to-emerald-500/80 rounded-full" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Stats Bar */}
              <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-surface-border">
                <div className="bg-surface/50 p-3 rounded-xl border border-surface-border/50">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Executions</div>
                  <div className="text-lg font-bold text-ink mt-0.5">{workflow.runs}</div>
                </div>
                <div className="bg-surface/50 p-3 rounded-xl border border-surface-border/50">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Reliability</div>
                  <div className={`text-lg font-bold mt-0.5 ${
                    workflow.successRate >= 90
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : workflow.successRate >= 70
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-500'
                  }`}>{workflow.successRate}%</div>
                </div>
                <div className="bg-surface/50 p-3 rounded-xl border border-surface-border/50">
                  <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold">Last Trigger</div>
                  <div className="text-xs font-semibold text-ink truncate mt-1">
                    {workflow.lastRun
                      ? workflow.lastRun.toLocaleDateString()
                      : 'Awaiting event'}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          WORKFLOW DETAILS MODAL
       ═══════════════════════════════════════════════════════════ */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card variant="glass" className="p-7 md:p-9 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-emerald-500/30 bg-surface/95 text-ink shadow-2xl relative">
            {/* Modal ambient glow */}
            <div className="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative">
              {/* Modal header */}
              <div className="flex items-start justify-between mb-7 pb-5 border-b border-surface-border">
                <div>
                  <div className="flex items-center gap-3">
                    <h2
                      className="text-xl sm:text-2xl font-bold text-ink"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {selectedWorkflow.name}
                    </h2>
                    <Badge
                      variant={selectedWorkflow.status === 'active' ? 'success' : 'warning'}
                      dot
                      pulse={selectedWorkflow.status === 'active'}
                    >
                      {selectedWorkflow.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-ink-muted text-xs sm:text-sm mt-1.5">{selectedWorkflow.description}</p>
                </div>
                <Button
                  onClick={() => setSelectedWorkflow(null)}
                  variant="glass"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-full text-ink-muted hover:text-ink hover:bg-surface-subtle"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-7">
                {/* Pipeline Component Library */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className="font-bold text-sm flex items-center gap-2 text-ink"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      <Grid className="w-4 h-4 text-emerald-500" />
                      Pipeline Component Library
                    </h3>
                    <span className="text-[11px] text-ink-muted">Click component to inspect</span>
                  </div>

                  <div className="space-y-5 mb-7">
                    {/* Available Triggers */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2.5">
                        <Target className="h-3.5 w-3.5 text-blue-500" /> Triggers
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableTriggers.map(trigger => {
                          const Icon = trigger.icon;
                          return (
                            <div
                              key={trigger.id}
                              className="p-3 border border-surface-border rounded-xl bg-surface/60 hover:bg-blue-500/10 hover:border-blue-500/30 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium text-ink group-hover:text-blue-700 dark:group-hover:text-blue-300">{trigger.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Available Actions */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Actions
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableActions.map(action => {
                          const Icon = action.icon;
                          return (
                            <div
                              key={action.id}
                              className="p-3 border border-surface-border rounded-xl bg-surface/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium text-ink group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{action.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Available Conditions */}
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2.5">
                        <Sliders className="h-3.5 w-3.5 text-amber-500" /> Conditions
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableConditions.map(condition => {
                          const Icon = condition.icon;
                          return (
                            <div
                              key={condition.id}
                              className="p-3 border border-surface-border rounded-xl bg-surface/60 hover:bg-amber-500/10 hover:border-amber-500/30 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium text-ink group-hover:text-amber-700 dark:group-hover:text-amber-300">{condition.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 p-5 bg-surface-subtle/80 border border-surface-border rounded-xl">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-ink-muted">Total Executions</div>
                    <div className="text-xl font-bold text-ink mt-1">{selectedWorkflow.runs}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-ink-muted">Success Rate</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {selectedWorkflow.successRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-ink-muted">Created</div>
                    <div className="text-sm font-semibold text-ink mt-1">
                      {selectedWorkflow.createdAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2.5 pt-5 border-t border-surface-border">
                  <Button variant="gradient" className="flex items-center gap-2 shadow-md shadow-emerald-500/20">
                    <Eye className="w-4 h-4" />
                    Test Execution
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </Button>
                  <Button variant="glass" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Telemetry
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          BEST PRACTICES FOOTER
       ═══════════════════════════════════════════════════════════ */}
      <Card variant="glass" className="p-7 bg-surface/80 border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="relative">
          <h3
            className="font-bold mb-4 flex items-center gap-2.5 text-ink text-base"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            Automation Pipeline Best Practices
          </h3>
          <ul className="text-xs text-ink-muted grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { title: 'Event-Driven', desc: 'Workflows trigger in real time based on system webhooks and events.' },
              { title: 'Fine-Grained Filters', desc: 'Add conditional branch logic to filter high-value leads and deals.' },
              { title: 'Parallel Dispatch', desc: 'Multiple notifications, SMS, and tasks dispatch concurrently.' },
              { title: 'Sandbox Testing', desc: 'Run dry executions to verify delivery payloads before production rollout.' },
            ].map(tip => (
              <li key={tip.title} className="flex items-start gap-3 p-3 rounded-xl bg-surface/40 border border-surface-border/50">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3" />
                </div>
                <span><strong>{tip.title}:</strong> {tip.desc}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
