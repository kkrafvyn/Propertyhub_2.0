import { supabase } from "./supabase";

const MOVE_IN_ITEMS = [
  { item_key: "keys_received", label: "Keys and access codes received", sort_order: 1 },
  { item_key: "utilities", label: "Utilities transferred or activated", sort_order: 2 },
  { item_key: "condition_walkthrough", label: "Property condition walkthrough completed", sort_order: 3 },
  { item_key: "inventory", label: "Inventory and fixtures checked", sort_order: 4 },
];

const MOVE_OUT_ITEMS = [
  { item_key: "cleaning", label: "Unit cleaned and cleared", sort_order: 1 },
  { item_key: "damage_review", label: "Damage / wear review completed", sort_order: 2 },
  { item_key: "keys_returned", label: "Keys returned", sort_order: 3 },
  { item_key: "deposit_release", label: "Deposit release requested", sort_order: 4 },
];

export const moveChecklistService = {
  async ensureChecklists(leaseId: string) {
    const { data: existing } = await supabase
      .from("move_checklist_items")
      .select("id")
      .eq("lease_id", leaseId)
      .limit(1);

    if (existing && existing.length > 0) {
      return this.getChecklists(leaseId);
    }

    const rows = [
      ...MOVE_IN_ITEMS.map((item) => ({ ...item, lease_id: leaseId, checklist_type: "move_in" })),
      ...MOVE_OUT_ITEMS.map((item) => ({ ...item, lease_id: leaseId, checklist_type: "move_out" })),
    ];

    const { error } = await supabase.from("move_checklist_items").insert(rows);
    if (error) throw error;
    return this.getChecklists(leaseId);
  },

  async getChecklists(leaseId: string) {
    const { data, error } = await supabase
      .from("move_checklist_items")
      .select("*")
      .eq("lease_id", leaseId)
      .order("checklist_type")
      .order("sort_order");

    if (error) throw error;
    return data || [];
  },

  async toggleItem(itemId: string, userId: string, completed: boolean, notes?: string) {
    const { data, error } = await supabase
      .from("move_checklist_items")
      .update({
        completed,
        completed_at: completed ? new Date().toISOString() : null,
        completed_by: completed ? userId : null,
        notes: notes || null,
      })
      .eq("id", itemId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
