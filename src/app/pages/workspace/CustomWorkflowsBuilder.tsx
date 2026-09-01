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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-yellow-500" />
            Custom Workflows
          </h1>
          <p className="text-gray-500 mt-1">Build automation workflows with no code required</p>
        </div>
        <Button
          onClick={() => setShowBuilder(!showBuilder)}
          disabled={!canManageWorkflows}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </Button>
      </div>

      {/* Workflow Builder */}
      {showBuilder && (
        <Card className="p-6 border-2 border-primary/40 bg-primary/5 dark:bg-primary/10">
          <h3 className="font-bold mb-4 text-foreground">Create New Workflow</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Workflow Name</label>
              <Input
                placeholder="e.g., Auto-notify agents on new listings"
                value={newWorkflowName}
                onChange={e => setNewWorkflowName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Trigger</label>
              <div className="grid grid-cols-2 gap-2">
                {availableTriggers.map((trigger) => (
                  <button
                    key={trigger.id}
                    type="button"
                    onClick={() => setSelectedTrigger(trigger.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedTrigger === trigger.id
                        ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30 dark:border-blue-600'
                        : 'border-border bg-card hover:bg-secondary'
                    }`}
                  >
                    {(() => { const Icon = trigger.icon; return <Icon className="inline-block w-4 h-4 mr-1" />; })()}
                    {trigger.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={createNewWorkflow}
                disabled={!newWorkflowName}
                className="bg-green-600 hover:bg-green-700"
              >
                Create
              </Button>
              <Button
                onClick={() => setShowBuilder(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Workflows List */}
      {workflows.length === 0 ? (
        <Card className="p-8 text-center">
          <Zap className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first automation workflow to streamline your workspace.
          </p>
          <Button onClick={() => setShowBuilder(true)} className="flex items-center gap-2 mx-auto">
            <Plus className="w-4 h-4" />
            Create Workflow
          </Button>
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map(workflow => (
          <Card
            key={workflow.id}
            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedWorkflow(workflow)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{workflow.name}</h3>
                  <Badge
                    className={
                      workflow.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : workflow.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-muted text-muted-foreground'
                    }
                  >
                    {workflow.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {workflow.status === 'draft' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-2">{workflow.description}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={e => {
                    e.stopPropagation();
                    toggleWorkflowStatus(workflow.id);
                  }}
                  size="sm"
                  variant="outline"
                  className={
                    workflow.status === 'active'
                      ? 'text-orange-600 border-orange-300'
                      : 'text-green-600 border-green-300'
                  }
                >
                  {workflow.status === 'active' ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={e => {
                    e.stopPropagation();
                    deleteWorkflow(workflow.id);
                  }}
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Workflow Steps Preview */}
            <div className="mb-4 p-3 bg-card rounded-lg border border-border">
              <div className="space-y-2">
                {workflow.steps.map((step, idx) => (
                  <div key={step.id}>
                    <div
                      className={`p-2 rounded text-sm font-medium flex items-center gap-2 ${
                        step.type === 'trigger'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                          : step.type === 'condition'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      }`}
                    >
                      {step.type === 'trigger' && <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                      {step.type === 'condition' && <Sliders className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />}
                      {step.type === 'action' && <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />}
                      {step.name}
                    </div>
                    {idx < workflow.steps.length - 1 && (
                      <div className="flex justify-center py-1">
                        <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Runs</div>
                <div className="text-lg font-bold">{workflow.runs}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{workflow.successRate}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Last Run</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {workflow.lastRun
                    ? workflow.lastRun.toLocaleDateString()
                    : 'Never'}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}

      {/* Workflow Details Modal */}
      {selectedWorkflow && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border-surface-border bg-surface text-ink">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedWorkflow.name}</h2>
                <p className="text-muted-foreground mt-1">{selectedWorkflow.description}</p>
              </div>
              <Button
                onClick={() => setSelectedWorkflow(null)}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Workflow Builder Area */}
              <div>
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Grid className="w-5 h-5" />
                  Workflow Steps
                </h3>

                <div className="space-y-4 mb-6">
                  {/* Available Triggers */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2.5">
                      <Target className="h-3.5 w-3.5 text-blue-500" /> Triggers
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableTriggers.map(trigger => {
                        const Icon = trigger.icon;
                        return (
                          <div
                            key={trigger.id}
                            className="p-3 border border-surface-border rounded-xl hover:bg-blue-50/60 dark:hover:bg-blue-900/20 cursor-pointer transition flex items-center gap-2.5"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium text-ink">{trigger.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Available Actions */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2.5">
                      <Sparkles className="h-3.5 w-3.5 text-green-500" /> Actions
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableActions.map(action => {
                        const Icon = action.icon;
                        return (
                          <div
                            key={action.id}
                            className="p-3 border border-surface-border rounded-xl hover:bg-green-50/60 dark:hover:bg-green-900/20 cursor-pointer transition flex items-center gap-2.5"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium text-ink">{action.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Available Conditions */}
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2.5">
                      <Sliders className="h-3.5 w-3.5 text-yellow-500" /> Conditions
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableConditions.map(condition => {
                        const Icon = condition.icon;
                        return (
                          <div
                            key={condition.id}
                            className="p-3 border border-surface-border rounded-xl hover:bg-yellow-50/60 dark:hover:bg-yellow-900/20 cursor-pointer transition flex items-center gap-2.5"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium text-ink">{condition.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-surface-subtle border border-surface-border rounded-xl">
                <div>
                  <div className="text-xs text-muted-foreground">Total Runs</div>
                  <div className="text-xl font-bold text-ink">{selectedWorkflow.runs}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Success Rate</div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {selectedWorkflow.successRate}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Created</div>
                  <div className="text-xs font-semibold text-ink">
                    {selectedWorkflow.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-surface-border">
                <Button className="flex items-center gap-2">
                  <Copy className="w-4 h-4" />
                  Duplicate
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Test Run
                </Button>
                <Button variant="outline" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Help */}
      <Card className="p-6 bg-surface border-surface-border">
        <h3 className="font-bold mb-3 flex items-center gap-2 text-ink text-sm">
          <Zap className="w-4 h-4 text-emerald-500" />
          Workflow Tips
        </h3>
        <ul className="text-xs text-ink-secondary space-y-2">
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Workflows run automatically based on triggers</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Add conditions to filter when actions execute</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Multiple actions can run sequentially</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>Test workflows before activating them</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
