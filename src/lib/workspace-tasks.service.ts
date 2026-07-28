import { supabase } from "./supabase";

export const workspaceTasksService = {
  async getOrganizationTasks(organizationId: string, status?: string) {
    let query = supabase
      .from("workspace_tasks")
      .select(`
        *,
        assignee:users!workspace_tasks_assigned_to_fkey(full_name, email),
        contact:organization_contacts(full_name, email, phone)
      `)
      .eq("organization_id", organizationId)
      .order("due_at", { ascending: true, nullsFirst: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getFollowUpInbox(organizationId: string, userId?: string) {
    const tasks = await this.getOrganizationTasks(organizationId);
    const openTasks = tasks.filter((task) => ["open", "in_progress"].includes(task.status));

    if (!userId) return openTasks;
    return openTasks.filter((task) => !task.assigned_to || task.assigned_to === userId);
  },

  async createTask(input: {
    organizationId: string;
    createdBy: string;
    title: string;
    description?: string;
    taskType?: string;
    priority?: string;
    dueAt?: string | null;
    assignedTo?: string | null;
    contactId?: string | null;
    dealCaseId?: string | null;
    listingId?: string | null;
  }) {
    const { data, error } = await supabase
      .from("workspace_tasks")
      .insert({
        organization_id: input.organizationId,
        created_by: input.createdBy,
        title: input.title,
        description: input.description || null,
        task_type: input.taskType || "follow_up",
        priority: input.priority || "medium",
        due_at: input.dueAt || null,
        assigned_to: input.assignedTo || null,
        contact_id: input.contactId || null,
        deal_case_id: input.dealCaseId || null,
        listing_id: input.listingId || null,
        status: "open",
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateTaskStatus(taskId: string, status: "open" | "in_progress" | "completed" | "cancelled") {
    const { data, error } = await supabase
      .from("workspace_tasks")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
