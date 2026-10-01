import { supabase } from "./supabase";

export type ListingProvider = "mls" | "zillow" | "realtor";

export interface MLSIntegrationStatus {
  provider: ListingProvider;
  configured: boolean;
  authentication: "server-managed";
}

export interface ListingSyncJob {
  id: string;
  organizationId: string;
  provider: ListingProvider;
  status: "pending" | "in_progress" | "completed" | "failed";
  listingsSync: number;
  listingsFailed: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

function mapSyncJob(row: any): ListingSyncJob {
  return {
    id: row.id,
    organizationId: row.organization_id,
    provider: row.provider,
    status: row.status,
    listingsSync: Number(row.listings_sync || 0),
    listingsFailed: Number(row.listings_failed || 0),
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    errorMessage: row.error_message || undefined,
  };
}

class MLSIntegrationService {
  async getProviderStatuses(organizationId: string): Promise<MLSIntegrationStatus[]> {
    const { data, error } = await supabase.functions.invoke("listing-syndication", {
      body: { action: "status", organizationId },
    });
    if (error) throw error;
    if (!Array.isArray(data?.providers)) throw new Error("Listing provider status response is invalid");
    return data.providers as MLSIntegrationStatus[];
  }

  async getExternalListingCounts(organizationId: string) {
    const { data, error } = await supabase
      .from("external_listings")
      .select("provider")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return (data || []).reduce<Record<string, number>>((counts, row) => {
      const provider = String(row.provider || "");
      counts[provider] = (counts[provider] || 0) + 1;
      return counts;
    }, {});
  }

  async syncListingsFromProvider(
    organizationId: string,
    provider: ListingProvider,
  ): Promise<ListingSyncJob> {
    const { data, error } = await supabase.functions.invoke("listing-syndication", {
      body: { action: "sync", organizationId, provider },
    });
    if (error) throw error;
    if (!data?.job) throw new Error("Listing sync response is invalid");
    return mapSyncJob(data.job);
  }

  async getExternalListings(organizationId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from("external_listings")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  async getSyncHistory(organizationId: string, limit = 20): Promise<ListingSyncJob[]> {
    const { data, error } = await supabase
      .from("listing_sync_jobs")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(mapSyncJob);
  }

  async linkExternalListing(externalListingId: string, internalListingId: string) {
    const { error } = await supabase
      .from("external_listings")
      .update({ linked_listing_id: internalListingId })
      .eq("id", externalListingId);
    if (error) throw error;
  }
}

export const mlsIntegrationService = new MLSIntegrationService();
