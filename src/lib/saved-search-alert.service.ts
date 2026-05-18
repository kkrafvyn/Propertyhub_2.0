import { communicationService } from "./communication.service";
import { listingService } from "./listing.service";
import { supabase } from "./supabase";

type AlertFrequency = "immediate" | "daily" | "weekly";

function buildTitleFromFilters(input: {
  listingType?: string;
  locationQuery?: string;
  propertyType?: string | null;
}) {
  const listingTypeLabel =
    input.listingType === "sale"
      ? "Buy"
      : input.listingType === "lease"
        ? "Lease"
        : "Rent";
  const location = input.locationQuery?.trim();
  const propertyType = input.propertyType?.trim();

  if (propertyType && location) {
    return `${listingTypeLabel}: ${propertyType} in ${location}`;
  }

  if (location) {
    return `${listingTypeLabel}: ${location}`;
  }

  if (propertyType) {
    return `${listingTypeLabel}: ${propertyType}`;
  }

  return `${listingTypeLabel} search alert`;
}

function frequencyIntervalMs(frequency: AlertFrequency) {
  switch (frequency) {
    case "weekly":
      return 1000 * 60 * 60 * 24 * 7;
    case "daily":
      return 1000 * 60 * 60 * 24;
    default:
      return 1000 * 60 * 5;
  }
}

function isDue(lastCheckedAt: string | null | undefined, frequency: AlertFrequency) {
  if (!lastCheckedAt) return true;
  const lastChecked = new Date(lastCheckedAt).getTime();
  return Date.now() - lastChecked >= frequencyIntervalMs(frequency);
}

function isNotificationDue(lastNotifiedAt: string | null | undefined, frequency: AlertFrequency) {
  if (!lastNotifiedAt) return true;
  const lastNotified = new Date(lastNotifiedAt).getTime();
  return Date.now() - lastNotified >= frequencyIntervalMs(frequency);
}

function toListingFilters(alert: any) {
  return {
    location: alert.location_query || undefined,
    priceMin: alert.price_min || undefined,
    priceMax: alert.price_max || undefined,
    bedrooms: alert.bedrooms || undefined,
    bathrooms: alert.bathrooms || undefined,
    propertyType: alert.property_type || undefined,
    listingType: alert.listing_type || undefined,
  };
}

export const savedSearchAlertService = {
  async getUserAlerts(userId: string) {
    const { data, error } = await supabase
      .from("saved_search_alerts")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createAlert(input: {
    userId: string;
    title?: string;
    locationQuery?: string;
    listingType?: "rental" | "sale" | "lease";
    propertyType?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    frequency?: AlertFrequency;
    initialMatchCount?: number;
  }) {
    const { data, error } = await supabase
      .from("saved_search_alerts")
      .insert({
        user_id: input.userId,
        title:
          input.title ||
          buildTitleFromFilters({
            listingType: input.listingType,
            locationQuery: input.locationQuery,
            propertyType: input.propertyType,
          }),
        location_query: input.locationQuery || null,
        listing_type: input.listingType || "rental",
        property_type: input.propertyType || null,
        price_min: input.priceMin ?? null,
        price_max: input.priceMax ?? null,
        bedrooms: input.bedrooms ?? null,
        bathrooms: input.bathrooms ?? null,
        frequency: input.frequency || "daily",
        last_match_count: input.initialMatchCount || 0,
        last_checked_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async updateAlert(id: string, updates: Record<string, unknown>) {
    const { data, error } = await supabase
      .from("saved_search_alerts")
      .update(updates as any)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAlert(id: string) {
    const { error } = await supabase.from("saved_search_alerts").delete().eq("id", id);
    if (error) throw error;
  },

  async refreshAlert(alert: any, userId?: string) {
    const searchResults = await listingService.searchListingsWithCount(
      toListingFilters(alert),
      8,
      0
    );
    const now = new Date().toISOString();
    const nextMatchCount = searchResults.total;
    const hasMoreMatches = nextMatchCount > (alert.last_match_count || 0);
    const shouldNotify =
      Boolean(userId) &&
      hasMoreMatches &&
      isNotificationDue(alert.last_notified_at, alert.frequency);

    if (shouldNotify && userId) {
      await communicationService.createInAppNotification({
        userId,
        notificationType: "saved_search_match",
        subject: `New matches for ${alert.title}`,
        content:
          nextMatchCount === 1
            ? "A new property matched your saved search."
            : `${nextMatchCount} properties now match your saved search.`,
        actionUrl: "/search",
      });
    }

    return this.updateAlert(alert.id, {
      last_checked_at: now,
      last_match_count: nextMatchCount,
      last_notified_at: shouldNotify ? now : alert.last_notified_at || null,
    });
  },

  async evaluateUserAlerts(userId: string) {
    const alerts = await this.getUserAlerts(userId);
    const dueAlerts = alerts.filter(
      (alert) => alert.is_active && isDue(alert.last_checked_at, alert.frequency as AlertFrequency)
    );

    const refreshed = await Promise.all(
      dueAlerts.map((alert) =>
        this.refreshAlert(alert, userId).catch((error) => {
          console.error("Failed to refresh saved search alert:", error);
          return null;
        })
      )
    );

    return refreshed.filter(Boolean);
  },
};
