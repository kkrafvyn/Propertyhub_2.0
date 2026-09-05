import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Plus, CheckSquare, AlertCircle, User, Calendar, ChevronDown, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { MetricCard } from "../../components/ui/MetricCard";
import { EmptyState } from "../../components/ux/EmptyState";
import type { Database } from "../../../lib/database.types";
import type { MemberRole } from "../../../lib/workspace";
import { canWorkspace } from "../../../lib/workspace-permissions";
import { organizationService } from "../../../lib/organization.service";
import { workspaceTasksService } from "../../../lib/workspace-tasks.service";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export function WorkspaceTasks({
  organization,
  currentUserId,
  currentRole,
}: {
  organization: Organization;
  currentUserId: string;
  currentRole: MemberRole | null;
}) {
  const canWrite = canWorkspace(currentRole, "tasks:write");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rows, memberRows] = await Promise.all([
        workspaceTasksService.getOrganizationTasks(organization.id),
        organizationService.getOrganizationMembers(organization.id),
      ]);
      setTasks(rows || []);
      setMembers(memberRows || []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [organization.id]);

  const inbox = useMemo(
    () => tasks.filter((task) => ["open", "in_progress"].includes(task.status)),
    [tasks]
  );

  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === "completed"),
    [tasks]
  );

  const urgentTasks = useMemo(
    () => inbox.filter((task) => ["high", "urgent"].includes(task.priority)),
    [inbox]
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Enter a task title.");
      return;
    }

    try {
      setSaving(true);
      await workspaceTasksService.createTask({
        organizationId: organization.id,
        createdBy: currentUserId,
        title: title.trim(),
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        priority,
        assignedTo: assignedTo || currentUserId,
        taskType: "follow_up",
      });
      toast.success("Task created.");
      setTitle("");
      setDueAt("");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to create task.");
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      setCompletingId(taskId);
      await workspaceTasksService.updateTaskStatus(taskId, "completed");
      toast.success("Task completed.");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update task.");
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-lg bg-surface-subtle animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-subtle animate-pulse border border-surface-border" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-surface-subtle animate-pulse border border-surface-border" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-ink">
          Tasks & Follow-ups
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Team follow-up inbox for client calls, property viewings, and workflow pipeline reminders.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Open Follow-ups"
          value={inbox.length}
          icon={Clock3}
          iconColor="amber"
          subtitle="Awaiting action"
        />
        <MetricCard
          title="Urgent Priority"
          value={urgentTasks.length}
          icon={AlertCircle}
          iconColor="terracotta"
          subtitle="High or urgent priority"
        />
        <MetricCard
          title="Completed"
          value={completedTasks.length}
          icon={CheckCircle2}
          iconColor="emerald"
          subtitle="Resolved tasks"
        />
        <MetricCard
          title="Total Assigned"
          value={tasks.length}
          icon={CheckSquare}
          iconColor="primary"
          subtitle="All pipeline reminders"
        />
      </div>

      {canWrite ? (
        <Card className="p-5 sm:p-6 border-surface-border bg-surface/90 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-ink">Create Follow-up Task</h2>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-12 gap-3" onSubmit={handleCreate}>
            <div className="md:col-span-5">
              <Input
                label="Task Title"
                placeholder="e.g. Call tenant regarding lease renewal deposit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="md:col-span-3">
              <Input
                label="Due Date & Time"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex flex-col justify-end">
              <label className="text-xs font-medium text-ink-secondary mb-1">Priority</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-lg border border-surface-border bg-surface-subtle pl-3 pr-8 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col justify-end">
              <label className="text-xs font-medium text-ink-secondary mb-1">Assignee</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-lg border border-surface-border bg-surface-subtle pl-3 pr-8 py-2 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary"
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                >
                  <option value="">Assign to me</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user?.full_name || member.user?.email}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
              </div>
            </div>

            <div className="md:col-span-12 flex justify-end pt-2">
              <Button type="submit" disabled={saving} size="sm" className="flex items-center gap-1.5 shadow-xs">
                <Plus className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Add Follow-up"}</span>
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Task Inbox */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-ink-muted" />
            <h2 className="text-base font-semibold text-ink">
              Follow-up Inbox ({inbox.length})
            </h2>
          </div>
        </div>

        {inbox.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description="You have no open tasks or follow-ups in this organization. Create a new task above when you need a pipeline reminder."
          />
        ) : (
          <div className="space-y-3">
            {inbox.map((task) => {
              const isUrgent = ["urgent", "high"].includes(task.priority);
              return (
                <Card
                  key={task.id}
                  className="p-4 sm:p-5 flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface shadow-xs hover:shadow-card transition-all lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-ink">{task.title}</p>
                      <Badge
                        variant={isUrgent ? "warning" : "outline"}
                        className="capitalize text-[10px] font-semibold px-2 py-0.2"
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-ink-secondary flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{task.assignee?.full_name || "Unassigned"}</span>
                      </div>

                      {task.due_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-ink-muted" />
                          <span>Due {new Date(task.due_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    <Badge variant="secondary" className="capitalize text-xs font-medium">
                      <Clock3 className="w-3 h-3 mr-1" />
                      {task.status.replace(/_/g, " ")}
                    </Badge>

                    {canWrite ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completingId === task.id}
                        onClick={() => void completeTask(task.id)}
                        className="flex items-center gap-1.5 hover:border-emerald-500/50 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{completingId === task.id ? "Completing..." : "Complete"}</span>
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
