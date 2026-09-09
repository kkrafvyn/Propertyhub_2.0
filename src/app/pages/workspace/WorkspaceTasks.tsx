import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Plus,
  CheckSquare,
  AlertCircle,
  User,
  Calendar,
  ChevronDown,
  ListFilter,
  Sparkles,
  RefreshCw,
  Search,
  X,
  Flame,
  Check,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const filteredInbox = useMemo(() => {
    let result = inbox;
    if (priorityFilter !== "all") {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (assigneeFilter === "me") {
      result = result.filter((t) => t.assigned_to === currentUserId);
    } else if (assigneeFilter !== "all") {
      result = result.filter((t) => t.assigned_to === assigneeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.assignee?.full_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [inbox, priorityFilter, assigneeFilter, searchQuery, currentUserId]);

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
    <div className="space-y-8">
      {/* ── Editorial Header ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/10 via-primary/5 to-surface/80 border border-amber-500/20 shadow-lg backdrop-blur-md">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold border border-amber-500/20 shadow-xs">
                <CheckSquare className="w-3.5 h-3.5" />
                Pipeline Task Manager
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {inbox.length} Open In-Queue
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight text-ink font-display">
              Tasks & Follow-ups
            </h1>
            <p className="mt-1.5 text-sm text-ink-secondary max-w-2xl leading-relaxed">
              Operational follow-up inbox for client inquiries, property inspections, lease renegotiations, and milestone reminders for {organization.name}.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              className="flex items-center gap-1.5 border-surface-border/80 bg-surface/60 backdrop-blur-xs hover:bg-surface rounded-xl text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Metric Cards with Halo Glow ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Open Follow-ups"
          value={inbox.length}
          icon={Clock3}
          iconColor="amber"
          glow="amber"
          subtitle="Awaiting team resolution"
        />
        <MetricCard
          title="Urgent Priority"
          value={urgentTasks.length}
          icon={AlertCircle}
          iconColor="terracotta"
          glow="terracotta"
          subtitle="High or immediate action"
        />
        <MetricCard
          title="Completed"
          value={completedTasks.length}
          icon={CheckCircle2}
          iconColor="emerald"
          glow="emerald"
          subtitle="Successfully closed tasks"
        />
        <MetricCard
          title="Total In Registry"
          value={tasks.length}
          icon={CheckSquare}
          iconColor="primary"
          glow="primary"
          subtitle="All organization tasks"
        />
      </div>

      {/* ── Create Follow-up Task Card ── */}
      {canWrite ? (
        <Card variant="glass" className="p-6 sm:p-7 border border-surface-border/80 bg-surface/80 backdrop-blur-md rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-surface-border/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-ink font-display">Create Follow-up Task</h2>
                <p className="text-xs text-ink-muted">Schedule an actionable task with automated reminder triggers</p>
              </div>
            </div>
            <span className="text-xs text-ink-muted hidden sm:inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> REOS Workflow Automations
            </span>
          </div>

          <form className="grid grid-cols-1 md:grid-cols-12 gap-4" onSubmit={handleCreate}>
            <div className="md:col-span-5">
              <Input
                label="Task Description & Target"
                placeholder="e.g. Call tenant regarding lease renewal deposit verification"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
                required
              />
            </div>

            <div className="md:col-span-3">
              <Input
                label="Due Date & Time"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="md:col-span-2 flex flex-col justify-end">
              <label className="text-xs font-medium text-ink-secondary mb-1">Priority</label>
              <div className="relative">
                <select
                  className="w-full appearance-none rounded-xl border border-surface-border bg-surface-subtle pl-3 pr-8 py-2.5 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
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
                  className="w-full appearance-none rounded-xl border border-surface-border bg-surface-subtle pl-3 pr-8 py-2.5 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
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
              <Button
                type="submit"
                disabled={saving}
                size="sm"
                className="bg-gradient-to-r from-amber-600 via-amber-500 to-primary hover:from-amber-500 hover:to-primary/90 text-white rounded-xl shadow-sm hover:shadow-md px-5 py-2 text-xs flex items-center gap-1.5 transition-all duration-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{saving ? "Scheduling..." : "Schedule Follow-up"}</span>
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* ── Follow-up Inbox & Filter Controls ── */}
      <Card variant="glass" className="p-6 border border-surface-border/80 bg-surface/80 backdrop-blur-md rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-surface-border/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ListFilter className="w-4 h-4 text-amber-500" />
              <h2 className="text-lg font-semibold text-ink font-display">
                Follow-up Inbox
              </h2>
              <Badge variant="outline" className="text-xs">{filteredInbox.length} / {inbox.length}</Badge>
            </div>
            <p className="text-xs text-ink-secondary mt-0.5">Filter by priority urgency, assigned teammate, or query</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Search */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks or assignees..."
                className="w-full pl-8 pr-8 py-1.5 rounded-xl text-xs bg-surface-subtle border border-surface-border text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Assignee Filter */}
            <div className="relative">
              <select
                className="appearance-none rounded-xl border border-surface-border bg-surface-subtle px-3 py-1.5 pr-7 text-xs font-medium text-ink focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="all">All assignees</option>
                <option value="me">Assigned to me</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user?.full_name || member.user?.email}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-muted" />
            </div>

            {/* Priority Filter Chips */}
            <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-xl border border-surface-border">
              {(["all", "urgent", "high", "medium", "low"] as const).map((p) => {
                const isActive = priorityFilter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriorityFilter(p)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg capitalize transition-all ${
                      isActive
                        ? "bg-surface text-ink shadow-2xs"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filteredInbox.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={inbox.length === 0 ? "All caught up" : "No matching tasks found"}
            description={
              inbox.length === 0
                ? "You have no open tasks or follow-ups in this organization. Create a new task above when you need a pipeline reminder."
                : "No open follow-up tasks match the selected filters. Clear your filters or try another search term."
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredInbox.map((task) => {
              const isUrgent = ["urgent", "high"].includes(task.priority);
              const isOverdue = task.due_at && new Date(task.due_at).getTime() < Date.now();
              return (
                <Card
                  key={task.id}
                  variant="glass"
                  className="p-4 sm:p-5 flex flex-col gap-3 rounded-2xl border border-surface-border/80 hover:border-amber-500/40 bg-surface/90 backdrop-blur-md shadow-2xs hover:shadow-xs transition-all duration-200 lg:flex-row lg:items-center lg:justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-ink group-hover:text-primary transition-colors">{task.title}</p>
                      <Badge
                        variant={task.priority === "urgent" ? "destructive" : isUrgent ? "warning" : "outline"}
                        className="capitalize text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1"
                      >
                        {isUrgent ? <Flame className="w-2.5 h-2.5" /> : null}
                        <span>{task.priority}</span>
                      </Badge>
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          <AlertTriangle className="w-2.5 h-2.5" /> Overdue
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-ink-secondary flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-surface-subtle flex items-center justify-center text-[10px] font-bold text-ink-secondary">
                          {(task.assignee?.full_name || "U")[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-ink">{task.assignee?.full_name || "Unassigned"}</span>
                      </div>

                      {task.due_at && (
                        <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-ink-muted"}`}>
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>Due {new Date(task.due_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                    <Badge variant="secondary" className="capitalize text-xs font-medium border-surface-border">
                      <Clock3 className="w-3 h-3 mr-1" />
                      {task.status.replace(/_/g, " ")}
                    </Badge>

                    {canWrite ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={completingId === task.id}
                        onClick={() => void completeTask(task.id)}
                        className="rounded-xl flex items-center gap-1.5 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
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
      </Card>
    </div>
  );
}
