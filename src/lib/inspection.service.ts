import { supabase } from "./supabase";

const DEFAULT_MOVE_IN_CHECKLIST = [
  { key: "walls", label: "Walls and paint condition", completed: false },
  { key: "flooring", label: "Flooring condition", completed: false },
  { key: "plumbing", label: "Plumbing and taps working", completed: false },
  { key: "electrical", label: "Electrical fixtures working", completed: false },
  { key: "appliances", label: "Appliances checked", completed: false },
];

const DEFAULT_MOVE_OUT_CHECKLIST = [
  { key: "cleaning", label: "Unit cleaned", completed: false },
  { key: "damage", label: "Damage documented", completed: false },
  { key: "keys", label: "Keys returned", completed: false },
];

export const inspectionService = {
  getDefaultChecklist(type: "move_in" | "move_out" | "routine" | "pre_purchase") {
    if (type === "move_out") return DEFAULT_MOVE_OUT_CHECKLIST;
    if (type === "move_in") return DEFAULT_MOVE_IN_CHECKLIST;
    return DEFAULT_MOVE_IN_CHECKLIST;
  },

  async getOrganizationInspections(organizationId: string) {
    const { data, error } = await supabase
      .from("property_inspections")
      .select(`
        *,
        listing:listings(id, property:properties(address, city)),
        tenant:users(full_name, email)
      `)
      .eq("organization_id", organizationId)
      .order("scheduled_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getTenantInspections(userId: string) {
    const { data, error } = await supabase
      .from("property_inspections")
      .select(`
        *,
        listing:listings(id, property:properties(address, city))
      `)
      .eq("tenant_user_id", userId)
      .order("scheduled_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async scheduleInspection(input: {
    organizationId: string;
    listingId: string;
    dealCaseId?: string | null;
    leaseId?: string | null;
    inspectionType: "move_in" | "move_out" | "routine" | "pre_purchase";
    scheduledAt: string;
    tenantUserId?: string | null;
    inspectorUserId?: string | null;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from("property_inspections")
      .insert({
        organization_id: input.organizationId,
        listing_id: input.listingId,
        deal_case_id: input.dealCaseId || null,
        lease_id: input.leaseId || null,
        inspection_type: input.inspectionType,
        scheduled_at: input.scheduledAt,
        tenant_user_id: input.tenantUserId || null,
        inspector_user_id: input.inspectorUserId || null,
        notes: input.notes || null,
        status: "scheduled",
        checklist: this.getDefaultChecklist(input.inspectionType),
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateInspection(
    inspectionId: string,
    updates: {
      status?: string;
      notes?: string;
      checklist?: unknown[];
      photoUrls?: string[];
      completedAt?: string | null;
    }
  ) {
    const { data, error } = await supabase
      .from("property_inspections")
      .update({
        status: updates.status,
        notes: updates.notes,
        checklist: updates.checklist,
        photo_urls: updates.photoUrls,
        completed_at: updates.completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", inspectionId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async completeInspection(inspectionId: string) {
    return this.updateInspection(inspectionId, {
      status: "completed",
      completedAt: new Date().toISOString(),
    });
  },

  async toggleChecklistItem(
    inspectionId: string,
    itemKey: string,
    completed: boolean
  ) {
    const { data: inspection, error: fetchError } = await supabase
      .from("property_inspections")
      .select("checklist")
      .eq("id", inspectionId)
      .single();

    if (fetchError) throw fetchError;

    const checklist = Array.isArray(inspection?.checklist) ? inspection.checklist : [];
    const nextChecklist = checklist.map((item: any) =>
      item.key === itemKey ? { ...item, completed } : item
    );

    return this.updateInspection(inspectionId, { checklist: nextChecklist });
  },

  async tenantSignOff(inspectionId: string, userId: string, signerName: string) {
    const { data, error } = await supabase
      .from("property_inspections")
      .update({
        notes: `Signed by tenant: ${signerName}`,
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", inspectionId)
      .eq("tenant_user_id", userId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
