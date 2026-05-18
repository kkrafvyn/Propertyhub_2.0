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
  organization:organizations(name, slug, logo_url, verified)
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
    return data;
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
      amenities?: string[];
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
      amenities?: string[];
    },
    limit = 20,
    offset = 0
  ) {
    const normalizedPropertyType = normalizePropertyCategory(filters.propertyType);
    const requiredAmenities = (filters.amenities || [])
      .map((amenity) => amenity.trim().toLowerCase())
      .filter(Boolean);

    const { data, error } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "listed")
      .eq("visibility", "public")
      .order("published_at", { ascending: false });

    if (error) throw error;

    const normalizedLocation = filters.location?.trim().toLowerCase();
    const filtered = (data || []).filter((listing) => {
      const property = listing.property as Database["public"]["Tables"]["properties"]["Row"] | null;
      const normalizedListingCategory = normalizePropertyCategory(property?.category);
      const listingAmenities = (property?.amenities || []).map((amenity) =>
        amenity.trim().toLowerCase()
      );
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
      if (
        requiredAmenities.length > 0 &&
        !requiredAmenities.every((amenity) => listingAmenities.includes(amenity))
      ) {
        return false;
      }
      if (normalizedLocation && !locationHaystack.includes(normalizedLocation)) return false;

      return true;
    });

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
        organization:organizations(name, slug, logo_url, verified, email, phone)
      `
      )
      .eq("id", id)
      .single();

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
};
