import { supabase } from "./supabase";
import type { Database } from "./database.types";

type VendorInsert = Database["public"]["Tables"]["vendor_assignments"]["Insert"];
type VendorUpdate = Database["public"]["Tables"]["vendor_assignments"]["Update"];

export const vendorService = {
  async getVerifiedVendors(category?: string | null, limit = 8) {
    let query = supabase
      .from("vendors")
      .select("*, services:vendor_services(*)")
      .eq("verified", true)
      .order("rating_avg", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (category) {
      query = query.eq("business_category", category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async searchVendors(serviceAreas: string[], category?: string | null, limit = 8) {
    let query = supabase
      .from("vendors")
      .select("*, services:vendor_services(*)")
      .eq("verified", true)
      .overlaps("service_areas", serviceAreas)
      .order("rating_avg", { ascending: false, nullsFirst: false })
      .limit(limit);

    if (category) {
      query = query.eq("business_category", category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getVendorRatings(vendorId: string) {
    const { data, error } = await supabase
      .from("vendor_ratings")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createAssignment(
    organizationId: string,
    propertyId: string,
    vendorId: string,
    serviceType: string,
    description: string,
    requestedDate: Date
  ) {
    const payload: VendorInsert = {
      organization_id: organizationId,
      property_id: propertyId,
      vendor_id: vendorId,
      service_type: serviceType,
      description,
      requested_date: requestedDate.toISOString(),
      status: "pending",
    };

    const { data, error } = await supabase
      .from("vendor_assignments")
      .insert(payload)
      .select("*, vendor:vendors(*), property:properties(*)")
      .single();

    if (error) throw error;
    return data;
  },

  async updateAssignment(assignmentId: string, updates: VendorUpdate) {
    const { data, error } = await supabase
      .from("vendor_assignments")
      .update(updates)
      .eq("id", assignmentId)
      .select("*, vendor:vendors(*), property:properties(*)")
      .single();

    if (error) throw error;
    return data;
  },

  async getAssignments(organizationId: string) {
    const { data, error } = await supabase
      .from("vendor_assignments")
      .select("*, vendor:vendors(*), property:properties(*)")
      .eq("organization_id", organizationId)
      .order("requested_date", { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
