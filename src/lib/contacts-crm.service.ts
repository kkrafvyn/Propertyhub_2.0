import { supabase } from "./supabase";

export const contactsCrmService = {
  async getOrganizationContacts(organizationId: string) {
    const { data, error } = await supabase
      .from("organization_contacts")
      .select(`
        *,
        assignee:users!organization_contacts_assigned_to_fkey(full_name, email)
      `)
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createContact(input: {
    organizationId: string;
    createdBy: string;
    fullName: string;
    email?: string;
    phone?: string;
    company?: string;
    source?: string;
    notes?: string;
    assignedTo?: string | null;
  }) {
    const { data, error } = await supabase
      .from("organization_contacts")
      .insert({
        organization_id: input.organizationId,
        created_by: input.createdBy,
        full_name: input.fullName,
        email: input.email || null,
        phone: input.phone || null,
        company: input.company || null,
        source: input.source || "manual",
        notes: input.notes || null,
        assigned_to: input.assignedTo || null,
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateContact(
    contactId: string,
    updates: {
      fullName?: string;
      email?: string | null;
      phone?: string | null;
      company?: string | null;
      status?: string;
      notes?: string | null;
      assignedTo?: string | null;
      lastContactedAt?: string | null;
    }
  ) {
    const { data, error } = await supabase
      .from("organization_contacts")
      .update({
        full_name: updates.fullName,
        email: updates.email,
        phone: updates.phone,
        company: updates.company,
        status: updates.status,
        notes: updates.notes,
        assigned_to: updates.assignedTo,
        last_contacted_at: updates.lastContactedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contactId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async archiveContact(contactId: string) {
    return this.updateContact(contactId, { status: "archived" });
  },
};
