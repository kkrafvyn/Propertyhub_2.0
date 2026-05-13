import { useEffect, useMemo, useState } from "react";
import { Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { Badge } from "@/app/components/ui/badge";
import { automationEngineService } from "@/lib/automation-engine.service";

interface AutomationWorkflowsProps {
  organizationId: string;
  currentRole: "owner" | "manager" | "agent" | "analyst" | null;
}

export default function AutomationWorkflows({
  organizationId,
  currentRole,
}: AutomationWorkflowsProps) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canManageWorkflows = currentRole === "owner" || currentRole === "manager";

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const data = await automationEngineService.getWorkflows(organizationId);
      setWorkflows(data || []);
    } catch (error) {
      console.error("Failed to load workflows:", error);
      toast.error("We couldn't load automation workflows.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkflows();
  }, [organizationId]);

  const handleToggleWorkflow = async (workflowId: string, enabled: boolean) => {
    try {
      await automationEngineService.toggleWorkflow(workflowId, !enabled);
      toast.success(`Workflow ${enabled ? "disabled" : "enabled"}.`);
      await loadWorkflows();
    } catch (error) {
      console.error("Failed to toggle workflow:", error);
      toast.error("We couldn't update that workflow.");
    }
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!window.confirm("Are you sure you want to delete this workflow?")) {
      return;
    }

    try {
      await automationEngineService.deleteWorkflow(workflowId);
      toast.success("Workflow deleted.");
      await loadWorkflows();
    } catch (error) {
      console.error("Failed to delete workflow:", error);
      toast.error("We couldn't delete that workflow.");
    }
  };

  const handleCreatePreset = async (preset: "lead" | "listing" | "payment") => {
    try {
      if (preset === "lead") {
        await automationEngineService.createLeadFollowUpWorkflow(organizationId);
      } else if (preset === "listing") {
        await automationEngineService.createListingExpiryWorkflow(organizationId);
      } else {
        await automationEngineService.createPaymentReminderWorkflow(organizationId);
      }

      toast.success("Workflow template created.");
      await loadWorkflows();
    } catch (error) {
      console.error("Failed to create workflow:", error);
      toast.error("We couldn't create that workflow.");
    }
  };

  const summary = useMemo(() => {
    const enabled = workflows.filter((workflow) => workflow.enabled).length;
    const totalRuns = workflows.reduce(
      (sum, workflow) => sum + (workflow.execution_count || 0),
      0
    );

    return {
      enabled,
      disabled: workflows.length - enabled,
      totalRuns,
    };
  }, [workflows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Automation Workflows</h1>
        <p className="text-muted-foreground mt-2">
          Live workflow templates and execution controls for your organization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Enabled</p>
          <p className="text-2xl font-semibold mt-1">{summary.enabled}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Disabled</p>
          <p className="text-2xl font-semibold mt-1">{summary.disabled}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Executions</p>
          <p className="text-2xl font-semibold mt-1">{summary.totalRuns}</p>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Quick Start Templates</h2>
          {!canManageWorkflows && (
            <Badge variant="outline">Owners and managers can create workflows</Badge>
          )}
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              id: "lead" as const,
              title: "Auto Lead Follow-up",
              description:
                "Automatically assign leads and create follow-up reminders when inquiries come in.",
            },
            {
              id: "listing" as const,
              title: "Listing Expiry Management",
              description:
                "Get warned before listing expirations and keep stale inventory under control.",
            },
            {
              id: "payment" as const,
              title: "Payment Reminders",
              description:
                "Create a workflow skeleton for pending payment follow-up and reminders.",
            },
          ].map((template) => (
            <Card key={template.id} className="p-4">
              <h3 className="font-semibold">{template.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
              <Button
                size="sm"
                className="mt-4 w-full"
                disabled={!canManageWorkflows}
                onClick={() => void handleCreatePreset(template.id)}
              >
                Create
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Workflows ({workflows.length})</h2>
          <Badge variant="outline">Live Supabase data</Badge>
        </div>

        {loading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading workflows...</Card>
        ) : workflows.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No workflows yet. Create one from the templates above to get started.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold">{workflow.name}</h3>
                      <Badge variant={workflow.enabled ? "default" : "secondary"}>
                        {workflow.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {workflow.workflow_type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {workflow.description || "Automation workflow"}
                    </p>
                    <div className="flex gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
                      <span>Executions: {workflow.execution_count || 0}</span>
                      <span className="capitalize">Trigger: {workflow.trigger_type || "manual"}</span>
                      {workflow.last_executed_at && (
                        <span>
                          Last run: {new Date(workflow.last_executed_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleToggleWorkflow(workflow.id, workflow.enabled)}
                      disabled={!canManageWorkflows}
                    >
                      {workflow.enabled ? (
                        <>
                          <Pause className="w-4 h-4 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDeleteWorkflow(workflow.id)}
                      disabled={!canManageWorkflows}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
