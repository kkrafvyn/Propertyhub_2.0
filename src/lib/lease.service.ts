import { supabase } from "./supabase";
import { paymentService } from "./payment.service";

export const leaseService = {
  async getTenantLeases(userId: string) {
    const { data, error } = await supabase
      .from("leases")
      .select(`
        *,
        listing:listings(
          id,
          listing_type,
          price,
          currency,
          property:properties(address, city, region, category)
        ),
        organization:organizations(name, slug, verified)
      `)
      .eq("tenant_user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getActiveTenantLeases(userId: string) {
    const leases = await this.getTenantLeases(userId);
    return leases.filter((lease) => lease.status === "active");
  },

  async getOrganizationLeases(organizationId: string) {
    const { data, error } = await supabase
      .from("leases")
      .select(`
        *,
        tenant:users(full_name, email, phone),
        listing:listings(
          id,
          property:properties(address, city, region)
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createLeaseFromDealCase(input: {
    dealCaseId: string;
    tenantUserId: string;
    listingId: string;
    organizationId: string;
    rentMinor: number;
    currency?: string;
    startDate?: string;
    endDate?: string | null;
  }) {
    const startDate = input.startDate || new Date().toISOString().slice(0, 10);
    const nextRentDue = new Date(startDate);
    nextRentDue.setMonth(nextRentDue.getMonth() + 1);

    const { data, error } = await supabase
      .from("leases")
      .insert({
        deal_case_id: input.dealCaseId,
        tenant_user_id: input.tenantUserId,
        listing_id: input.listingId,
        organization_id: input.organizationId,
        start_date: startDate,
        end_date: input.endDate || null,
        rent_minor: input.rentMinor,
        currency: input.currency || "GHS",
        status: "active",
        next_rent_due_at: nextRentDue.toISOString().slice(0, 10),
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async payRent(lease: {
    id: string;
    listing_id: string;
    deal_case_id?: string | null;
    rent_minor: number;
    currency?: string;
  }) {
    const checkout = await paymentService.initializePropertyPayment({
      listingId: lease.listing_id,
      amount: lease.rent_minor / 100,
      purpose: "rent",
      dealCaseId: lease.deal_case_id || null,
    });

    window.location.href = checkout.authorizationUrl;
    return checkout;
  },

  async advanceRentDueDate(leaseId: string) {
    const { data: lease, error: fetchError } = await supabase
      .from("leases")
      .select("next_rent_due_at")
      .eq("id", leaseId)
      .single();

    if (fetchError) throw fetchError;

    const base = lease.next_rent_due_at
      ? new Date(`${lease.next_rent_due_at}T00:00:00`)
      : new Date();
    base.setMonth(base.getMonth() + 1);

    const { data, error } = await supabase
      .from("leases")
      .update({ next_rent_due_at: base.toISOString().slice(0, 10) })
      .eq("id", leaseId)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },
};
