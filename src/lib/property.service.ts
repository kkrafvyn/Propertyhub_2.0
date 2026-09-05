import { supabase } from "./supabase";
import type { Database } from "./database.types";
import { ensureEstateForProperty } from "./estate-property-link.service";

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
    const created = data[0];
    if (created?.id && created.organization_id) {
      try {
        await ensureEstateForProperty({
          id: created.id,
          organization_id: created.organization_id,
          address: created.address,
          city: created.city,
          region: created.region,
        });
      } catch (linkError) {
        console.error("Failed to auto-link property to managed estate:", linkError);
      }
    }
    return created;
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
