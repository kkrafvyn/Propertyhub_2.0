import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/badge';
import { automationEngineService } from '../../../lib/automation-engine.service';
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
  { id: 'new_listing', label: 'New Listing Created', icon: '📋' },
  { id: 'property_updated', label: 'Property Updated', icon: '✏️' },
  { id: 'deal_created', label: 'Deal Created', icon: '🤝' },
  { id: 'message_received', label: 'Message Received', icon: '💬' },
  { id: 'price_change', label: 'Price Changed', icon: '💰' },
];

const availableActions = [
  { id: 'send_email', label: 'Send Email', icon: '📧' },
  { id: 'send_sms', label: 'Send SMS', icon: '📱' },
  { id: 'create_task', label: 'Create Task', icon: '✅' },
  { id: 'update_field', label: 'Update Field', icon: '🔄' },
  { id: 'create_notification', label: 'Create Notification', icon: '🔔' },
  { id: 'webhook', label: 'Call Webhook', icon: '🔗' },
];

const availableConditions = [
  { id: 'price_range', label: 'Price Range', icon: '💵' },
  { id: 'location', label: 'Location Match', icon: '📍' },
  { id: 'property_type', label: 'Property Type', icon: '🏠' },
  { id: 'time', label: 'Time-based', icon: '⏰' },
  { id: 'user_role', label: 'User Role', icon: '👤' },
];

interface CustomWorkflowsBuilderProps {
  organizationId: string;
  currentRole: 'owner' | 'manager' | 'agent' | 'analyst' | null;
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
        <Card className="p-6 border-2 border-blue-500 bg-blue-50">
          <h3 className="font-bold mb-4">Create New Workflow</h3>
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
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="mr-2">{trigger.icon}</span>
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
                          : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {workflow.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                    {workflow.status === 'draft' && <AlertCircle className="w-3 h-3 mr-1" />}
                    {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm mt-2">{workflow.description}</p>
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
            <div className="mb-4 p-3 bg-white rounded-lg border">
              <div className="space-y-2">
                {workflow.steps.map((step, idx) => (
                  <div key={step.id}>
                    <div
                      className={`p-2 rounded text-sm font-medium flex items-center gap-2 ${
                        step.type === 'trigger'
                          ? 'bg-blue-100 text-blue-800'
                          : step.type === 'condition'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {step.type === 'trigger' && '🎯'}
                      {step.type === 'condition' && '⚙️'}
                      {step.type === 'action' && '✨'}
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
                <div className="text-sm text-gray-600">Runs</div>
                <div className="text-lg font-bold">{workflow.runs}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Success Rate</div>
                <div className="text-lg font-bold text-green-600">{workflow.successRate}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Run</div>
                <div className="text-xs text-gray-600">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedWorkflow.name}</h2>
                <p className="text-gray-600 mt-2">{selectedWorkflow.description}</p>
              </div>
              <Button
                onClick={() => setSelectedWorkflow(null)}
                variant="outline"
                className="px-2"
              >
                ✕
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
                    <label className="text-sm font-medium block mb-3">🎯 Triggers</label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableTriggers.map(trigger => (
                        <div
                          key={trigger.id}
                          className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                          <span className="text-lg mr-2">{trigger.icon}</span>
                          <span className="text-sm">{trigger.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Available Actions */}
                  <div>
                    <label className="text-sm font-medium block mb-3">✨ Actions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableActions.map(action => (
                        <div
                          key={action.id}
                          className="p-3 border rounded-lg hover:bg-green-50 cursor-pointer transition-colors"
                        >
                          <span className="text-lg mr-2">{action.icon}</span>
                          <span className="text-sm">{action.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Available Conditions */}
                  <div>
                    <label className="text-sm font-medium block mb-3">⚙️ Conditions</label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableConditions.map(condition => (
                        <div
                          key={condition.id}
                          className="p-3 border rounded-lg hover:bg-yellow-50 cursor-pointer transition-colors"
                        >
                          <span className="text-lg mr-2">{condition.icon}</span>
                          <span className="text-sm">{condition.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm text-gray-600">Total Runs</div>
                  <div className="text-2xl font-bold">{selectedWorkflow.runs}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Success Rate</div>
                  <div className="text-2xl font-bold text-green-600">
                    {selectedWorkflow.successRate}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Created</div>
                  <div className="text-sm font-medium">
                    {selectedWorkflow.createdAt.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
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
      <Card className="p-6 bg-blue-50">
        <h3 className="font-bold mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          Workflow Tips
        </h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li>✓ Workflows run automatically based on triggers</li>
          <li>✓ Add conditions to filter when actions execute</li>
          <li>✓ Multiple actions can run sequentially</li>
          <li>✓ Test workflows before activating them</li>
        </ul>
      </Card>
    </div>
  );
}
