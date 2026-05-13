import { supabase } from "./supabase";
import type { Database } from "./database.types";

type PropertyInsert = Database["public"]["Tables"]["properties"]["Insert"];
type PropertyUpdate = Database["public"]["Tables"]["properties"]["Update"];

const PROPERTY_SELECT = `
  *,
  media:property_media(*)
`;

export const propertyService = {
  async getPropertyById(id: string) {
    const { data, error } = await supabase
      .from("properties")
      .select(PROPERTY_SELECT)
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async getOrganizationProperties(organizationId: string) {
    const { data, error } = await supabase
      .from("properties")
      .select(PROPERTY_SELECT)
      .eq("organization_id", organizationId);

    if (error) throw error;
    return data;
  },

  async createProperty(property: PropertyInsert) {
    const { data, error } = await supabase.from("properties").insert(property).select();

    if (error) throw error;
    return data[0];
  },

  async updateProperty(id: string, updates: PropertyUpdate) {
    const { data, error } = await supabase
      .from("properties")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  async deleteProperty(id: string) {
    const { error } = await supabase.from("properties").delete().eq("id", id);
    if (error) throw error;
  },
};
