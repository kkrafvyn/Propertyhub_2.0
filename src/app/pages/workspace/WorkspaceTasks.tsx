import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
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
      await workspaceTasksService.updateTaskStatus(taskId, "completed");
      toast.success("Task completed.");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Unable to update task.");
    }
  };

  if (loading) {
    return <Card className="p-8 text-center text-muted-foreground">Loading tasks...</Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Tasks & Follow-ups</h1>
        <p className="text-muted-foreground mt-2">
          Team follow-up inbox for calls, viewings, and pipeline reminders.
        </p>
      </div>

      {canWrite ? (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Create task</h2>
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleCreate}>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input
            label="Due date"
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
          <select
            className="rounded-lg border border-border px-3 py-2 text-sm"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <select
            className="rounded-lg border border-border px-3 py-2 text-sm"
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
          <Button type="submit" disabled={saving}>
            <Plus className="w-4 h-4" />
            {saving ? "Saving..." : "Add task"}
          </Button>
        </form>
      </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Follow-up inbox ({inbox.length})</h2>
        {inbox.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          <div className="space-y-3">
            {inbox.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-3 rounded-xl border border-border p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {task.assignee?.full_name || "Unassigned"}
                    {task.due_at ? ` · Due ${new Date(task.due_at).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {task.priority}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    <Clock3 className="w-3 h-3 mr-1" />
                    {task.status.replace(/_/g, " ")}
                  </Badge>
                  {canWrite ? (
                    <Button size="sm" onClick={() => void completeTask(task.id)}>
                      <CheckCircle2 className="w-4 h-4" />
                      Complete
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
