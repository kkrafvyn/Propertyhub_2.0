import { supabase } from "./supabase";
import type { Database } from "./database.types";
import { normalizePropertyCategory } from "./property-category";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];

const LISTING_SELECT = `
  *,
  property:properties(
    *,
    media:property_media(*)
  ),
  organization:organizations(name, logo_url, verified, slug)
`;

export const listingService = {
  async getPublicListings(limit = 20, offset = 0) {
    const { data, error } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "listed")
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  },

  async searchListings(
    filters: {
      location?: string;
      priceMin?: number;
      priceMax?: number;
      bedrooms?: number;
      bathrooms?: number;
      propertyType?: string;
      listingType?: string;
    },
    limit = 20,
    offset = 0
  ) {
    const searchResults = await this.searchListingsWithCount(filters, limit, offset);
    return searchResults.results;
  },

  async searchListingsWithCount(
    filters: {
      location?: string;
      priceMin?: number;
      priceMax?: number;
      bedrooms?: number;
      bathrooms?: number;
      propertyType?: string;
      listingType?: string;
      organizationSlug?: string;
      sort?: "newest" | "price_asc" | "price_desc";
    },
    limit = 20,
    offset = 0
  ) {
    const normalizedPropertyType = normalizePropertyCategory(filters.propertyType);

    const { data, error } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "listed")
      .eq("visibility", "public")
      .order("published_at", { ascending: false });

    if (error) throw error;

    const normalizedLocation = filters.location?.trim().toLowerCase();
    let filtered = (data || []).filter((listing) => {
      const property = listing.property as Database["public"]["Tables"]["properties"]["Row"] | null;
      const organization = listing.organization as { slug?: string } | null;
      const normalizedListingCategory = normalizePropertyCategory(property?.category);
      const locationHaystack = [property?.address, property?.city, property?.region, property?.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (filters.priceMin && listing.price < filters.priceMin) return false;
      if (filters.priceMax && listing.price > filters.priceMax) return false;
      if (filters.listingType && listing.listing_type !== filters.listingType) return false;
      if (normalizedPropertyType && normalizedListingCategory !== normalizedPropertyType) return false;
      if (filters.bedrooms && (property?.bedrooms || 0) < filters.bedrooms) return false;
      if (filters.bathrooms && (property?.bathrooms || 0) < filters.bathrooms) return false;
      if (normalizedLocation && !locationHaystack.includes(normalizedLocation)) return false;
      if (filters.organizationSlug && organization?.slug !== filters.organizationSlug) return false;

      return true;
    });

    if (filters.sort === "price_asc") {
      filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (filters.sort === "price_desc") {
      filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return {
      results: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  },

  async getListingById(id: string) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        property:properties(
          *,
          media:property_media(*)
        ),
        organization:organizations(name, logo_url, verified, email, phone, slug)
      `
      )
      .eq("id", id)
      .eq("status", "listed")
      .eq("visibility", "public")
      .single();

    if (error) throw error;
    return data;
  },

  async getListingForPayment(id: string) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        id,
        currency,
        price,
        listing_type,
        status,
        property:properties(
          id,
          address,
          city,
          region,
          country
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getOrganizationListings(organizationId: string) {
    const { data, error } = await supabase
      .from("listings")
      .select(
        `
        *,
        property:properties(
          *,
          media:property_media(*)
        )
      `
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createListing(listing: ListingInsert) {
    const { data, error } = await supabase.from("listings").insert(listing).select();

    if (error) throw error;
    return data[0];
  },

  async updateListing(id: string, updates: ListingUpdate) {
    const { data, error } = await supabase
      .from("listings")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) throw error;
    return data[0];
  },

  async deleteListing(id: string) {
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) throw error;
  },

  async toggleFeatured(id: string, featured: boolean) {
    return this.updateListing(id, { featured });
  },

  async getBrowseStats() {
    const { data, error } = await supabase
      .from("listings")
      .select("property:properties(category, neighborhood, city, region, location_confidence)")
      .eq("status", "listed")
      .eq("visibility", "public");

    if (error) throw error;

    const categoryCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};
    const locationMeta: Record<string, { city: string; region: string; count: number }> = {};

    for (const listing of data || []) {
      const propertyRow = listing.property as
        | Database["public"]["Tables"]["properties"]["Row"]
        | Database["public"]["Tables"]["properties"]["Row"][]
        | null;
      const property = Array.isArray(propertyRow) ? propertyRow[0] : propertyRow;
      const category = normalizePropertyCategory(property?.category);
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }

      const neighborhood = property?.neighborhood?.trim();
      const city = property?.city?.trim();
      const region = property?.region?.trim() || "Ghana";
      const locationName = neighborhood || city;

      if (locationName) {
        locationCounts[locationName] = (locationCounts[locationName] || 0) + 1;
        locationMeta[locationName] = {
          city: city || locationName,
          region,
          count: locationCounts[locationName],
        };
      }
    }

    const popularLocations = Object.entries(locationMeta)
      .map(([name, meta]) => ({ name, ...meta }))
      .sort((a, b) => b.count - a.count);

    return { categoryCounts, locationCounts, popularLocations };
  },

  async getPopularLocations(limit = 6) {
    const { popularLocations } = await this.getBrowseStats();
    return popularLocations.slice(0, limit);
  },
};
