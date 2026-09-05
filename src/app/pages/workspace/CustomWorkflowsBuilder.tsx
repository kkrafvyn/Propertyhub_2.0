import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
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

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading workflows...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                Custom Workflows
              </h1>
              <Badge variant="success" dot pulse>Engine Active</Badge>
            </div>
            <p className="text-sm text-ink-muted mt-1">Autonomous event-driven automation pipelines with zero code</p>
          </div>
        </div>
        <Button
          onClick={() => setShowBuilder(!showBuilder)}
          disabled={!canManageWorkflows}
          variant={showBuilder ? 'outline' : 'gradient'}
          className="flex items-center gap-2 shrink-0"
        >
          {showBuilder ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showBuilder ? 'Close Builder' : 'Create Pipeline'}
        </Button>
      </div>

      {/* Workflow Builder */}
      {showBuilder && (
        <Card variant="glass" className="p-6 sm:p-8 border-emerald-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Design New Automation Pipeline</h3>
                <p className="text-xs text-ink-muted">Configure your event trigger and pipeline logic</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                  Pipeline Name
                </label>
                <Input
                  placeholder="e.g. VIP Lead Auto-Nurture & SMS Alert"
                  value={newWorkflowName}
                  onChange={e => setNewWorkflowName(e.target.value)}
                  className="bg-surface/80 border-surface-border text-ink focus:border-emerald-500 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2.5">
                  Select Ingestion Trigger
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {availableTriggers.map((trigger) => {
                    const Icon = trigger.icon;
                    const isSelected = selectedTrigger === trigger.id;
                    return (
                      <button
                        key={trigger.id}
                        type="button"
                        onClick={() => setSelectedTrigger(trigger.id)}
                        className={`group relative rounded-xl border p-3.5 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/10 text-emerald-950 dark:text-emerald-100 ring-1 ring-emerald-500/30'
                            : 'border-surface-border bg-surface/60 hover:bg-surface hover:border-emerald-500/30 text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-emerald-500 text-white'
                              : 'bg-surface-subtle text-ink-muted group-hover:text-emerald-600 dark:group-hover:text-emerald-400'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold truncate">{trigger.label}</span>
                            <span className="block text-[11px] text-ink-muted truncate">Event trigger</span>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
                <Button
                  onClick={createNewWorkflow}
                  disabled={!newWorkflowName.trim()}
                  variant="gradient"
                  className="flex items-center gap-2 shadow-md shadow-emerald-500/20"
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

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <Card variant="glass" className="p-12 text-center relative overflow-hidden">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Zap className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-ink">No active automation pipelines</h3>
          <p className="text-ink-muted text-sm max-w-md mx-auto mb-6">
            Create automated workflows to handle lead assignments, instant client messaging, and listing price alerts automatically.
          </p>
          <Button onClick={() => setShowBuilder(true)} variant="gradient" className="flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20">
            <Plus className="w-4 h-4" />
            Build Your First Pipeline
          </Button>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map(workflow => (
          <Card
            key={workflow.id}
            variant="glass"
            className="p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl cursor-pointer group relative overflow-hidden flex flex-col justify-between"
            onClick={() => setSelectedWorkflow(workflow)}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
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
              <div className="mb-5 p-3.5 bg-surface-subtle/70 rounded-xl border border-surface-border">
                <div className="text-[10px] font-bold uppercase tracking-widest text-ink-muted mb-2.5 flex items-center justify-between">
                  <span>Execution Sequence</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">{workflow.steps.length} Steps</span>
                </div>
                <div className="space-y-2">
                  {workflow.steps.map((step, idx) => (
                    <div key={step.id}>
                      <div
                        className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between border transition-all ${
                          step.type === 'trigger'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
                            : step.type === 'condition'
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200'
                              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
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
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                          {step.type}
                        </span>
                      </div>
                      {idx < workflow.steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="w-0.5 h-3 bg-gradient-to-b from-emerald-500/40 to-emerald-500/80 rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Stats Bar */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-border">
              <div className="bg-surface/40 p-2.5 rounded-lg border border-surface-border/50">
                <div className="text-[10px] uppercase tracking-wider text-ink-muted">Executions</div>
                <div className="text-base font-bold text-ink">{workflow.runs}</div>
              </div>
              <div className="bg-surface/40 p-2.5 rounded-lg border border-surface-border/50">
                <div className="text-[10px] uppercase tracking-wider text-ink-muted">Reliability</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{workflow.successRate}%</div>
              </div>
              <div className="bg-surface/40 p-2.5 rounded-lg border border-surface-border/50">
                <div className="text-[10px] uppercase tracking-wider text-ink-muted">Last Trigger</div>
                <div className="text-xs font-semibold text-ink truncate mt-0.5">
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

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <Card variant="glass" className="p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-emerald-500/30 bg-surface/95 text-ink shadow-2xl relative">
            <div className="flex items-start justify-between mb-6 pb-4 border-b border-surface-border">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-ink">{selectedWorkflow.name}</h2>
                  <Badge
                    variant={selectedWorkflow.status === 'active' ? 'success' : 'warning'}
                    dot
                    pulse={selectedWorkflow.status === 'active'}
                  >
                    {selectedWorkflow.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-ink-muted text-xs sm:text-sm mt-1">{selectedWorkflow.description}</p>
              </div>
              <Button
                onClick={() => setSelectedWorkflow(null)}
                variant="glass"
                size="sm"
                className="h-8 w-8 p-0 rounded-full text-ink-muted hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Workflow Builder Area */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-ink">
                    <Grid className="w-4 h-4 text-emerald-500" />
                    Pipeline Component Library
                  </h3>
                  <span className="text-[11px] text-ink-muted">Click component to inspect</span>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Available Triggers */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2">
                      <Target className="h-3.5 w-3.5 text-blue-500" /> Triggers
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableTriggers.map(trigger => {
                        const Icon = trigger.icon;
                        return (
                          <div
                            key={trigger.id}
                            className="p-2.5 border border-surface-border rounded-xl bg-surface/60 hover:bg-blue-500/10 hover:border-blue-500/30 cursor-pointer transition-all flex items-center gap-2.5 group"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
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
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Actions
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableActions.map(action => {
                        const Icon = action.icon;
                        return (
                          <div
                            key={action.id}
                            className="p-2.5 border border-surface-border rounded-xl bg-surface/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 cursor-pointer transition-all flex items-center gap-2.5 group"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
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
                    <label className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5 mb-2">
                      <Sliders className="h-3.5 w-3.5 text-amber-500" /> Conditions
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableConditions.map(condition => {
                        const Icon = condition.icon;
                        return (
                          <div
                            key={condition.id}
                            className="p-2.5 border border-surface-border rounded-xl bg-surface/60 hover:bg-amber-500/10 hover:border-amber-500/30 cursor-pointer transition-all flex items-center gap-2.5 group"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
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
              <div className="grid grid-cols-3 gap-3 p-4 bg-surface-subtle/80 border border-surface-border rounded-xl">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-muted">Total Executions</div>
                  <div className="text-lg font-bold text-ink mt-0.5">{selectedWorkflow.runs}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-muted">Success Rate</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedWorkflow.successRate}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-semibold text-ink-muted">Created</div>
                  <div className="text-xs font-semibold text-ink mt-1">
                    {selectedWorkflow.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-surface-border">
                <Button variant="gradient" className="flex items-center gap-2 shadow-sm shadow-emerald-500/20">
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
          </Card>
        </div>
      )}

      {/* Quick Help */}
      <Card variant="glass" className="p-6 bg-surface/80 border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <h3 className="font-bold mb-3 flex items-center gap-2 text-ink text-sm">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5" />
          </div>
          Automation Pipeline Best Practices
        </h3>
        <ul className="text-xs text-ink-muted grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <li className="flex items-start gap-2.5 p-2 rounded-lg bg-surface/40 border border-surface-border/50">
            <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-2.5 w-2.5" />
            </div>
            <span><strong>Event-Driven:</strong> Workflows trigger in real time based on system webhooks and events.</span>
          </li>
          <li className="flex items-start gap-2.5 p-2 rounded-lg bg-surface/40 border border-surface-border/50">
            <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-2.5 w-2.5" />
            </div>
            <span><strong>Fine-Grained Filters:</strong> Add conditional branch logic to filter high-value leads and deals.</span>
          </li>
          <li className="flex items-start gap-2.5 p-2 rounded-lg bg-surface/40 border border-surface-border/50">
            <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-2.5 w-2.5" />
            </div>
            <span><strong>Parallel Dispatch:</strong> Multiple notifications, SMS, and tasks dispatch concurrently.</span>
          </li>
          <li className="flex items-start gap-2.5 p-2 rounded-lg bg-surface/40 border border-surface-border/50">
            <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Check className="h-2.5 w-2.5" />
            </div>
            <span><strong>Sandbox Testing:</strong> Run dry executions to verify delivery payloads before production rollout.</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
