import { supabase } from "./supabase";
import type { Database } from "./database.types";
import { normalizePropertyCategory } from "./property-category";
import { propertyService } from "./property.service";

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
      sort?: "newest" | "price_asc" | "price_desc" | "featured";
      verifiedOnly?: boolean;
      featuredOnly?: boolean;
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
      const organization = listing.organization as { slug?: string; verified?: boolean } | null;
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
      if (filters.verifiedOnly && !organization?.verified) return false;
      if (filters.featuredOnly && !listing.featured) return false;

      return true;
    });

    if (filters.sort === "price_asc") {
      filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (filters.sort === "price_desc") {
      filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (filters.sort === "featured") {
      filtered = [...filtered].sort(
        (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      );
    }

    return {
      results: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  },

  async getSimilarListings(listingId: string, limit = 4) {
    const listing = await this.getListingById(listingId);
    const property = Array.isArray(listing.property) ? listing.property[0] : listing.property;
    const price = listing.price || 0;

    const { results } = await this.searchListingsWithCount(
      {
        location: property?.city || property?.neighborhood || undefined,
        listingType: listing.listing_type,
        propertyType: property?.category || undefined,
        priceMin: price > 0 ? Math.floor(price * 0.75) : undefined,
        priceMax: price > 0 ? Math.ceil(price * 1.25) : undefined,
        bedrooms: property?.bedrooms || undefined,
        sort: "featured",
      },
      limit + 1,
      0
    );

    return results.filter((item) => item.id !== listingId).slice(0, limit);
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

  async bulkUpdateListings(
    listingIds: string[],
    updates: ListingUpdate
  ) {
    if (listingIds.length === 0) return [];

    const { data, error } = await supabase
      .from("listings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .in("id", listingIds)
      .select();

    if (error) throw error;
    return data || [];
  },

  async duplicateListing(listingId: string, organizationId: string) {
    const { data: source, error: fetchError } = await supabase
      .from("listings")
      .select(
        `
        *,
        property:properties(*, media:property_media(*))
      `
      )
      .eq("id", listingId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError) throw fetchError;
    if (!source) throw new Error("Listing not found");

    const property = Array.isArray(source.property) ? source.property[0] : source.property;
    if (!property) throw new Error("Property not found for listing");

    const newProperty = await propertyService.createProperty({
      organization_id: organizationId,
      address: property.address ? `${property.address} (Copy)` : "Copy",
      city: property.city,
      region: property.region,
      country: property.country,
      neighborhood: property.neighborhood,
      ghana_post_gps: property.ghana_post_gps,
      category: property.category,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      square_meters: property.square_meters,
      description: property.description,
      amenities: property.amenities,
      location_confidence: property.location_confidence,
    });

    const mediaItems = Array.isArray(property.media) ? property.media : [];
    if (mediaItems.length > 0) {
      const { error: mediaError } = await supabase.from("property_media").insert(
        mediaItems.map((item: any, index: number) => ({
          property_id: newProperty.id,
          organization_id: organizationId,
          storage_path: item.storage_path,
          public_url: item.public_url,
          alt_text: item.alt_text,
          sort_order: item.sort_order ?? index,
          is_primary: item.is_primary && index === 0,
          media_type: item.media_type || "image",
        }))
      );
      if (mediaError) throw mediaError;
    }

    const newListing = await this.createListing({
      organization_id: organizationId,
      property_id: newProperty.id,
      listing_type: source.listing_type,
      price: source.price,
      currency: source.currency,
      status: "draft",
      visibility: source.visibility,
      featured: false,
      whatsapp_enabled: source.whatsapp_enabled,
      inspection_fee_amount: source.inspection_fee_amount,
      minimum_deposit_amount: source.minimum_deposit_amount,
      title_document_status: source.title_document_status,
    });

    return newListing;
  },

  async getPopularLocations(limit = 6) {
    const { popularLocations } = await this.getBrowseStats();
    return popularLocations.slice(0, limit);
  },
};
