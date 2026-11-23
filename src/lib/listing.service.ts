import type { SearchBounds } from "./consumer-discovery";
import { supabase } from "./supabase";
import type { Database } from "./database.types";
import { normalizePropertyCategory } from "./property-category";
import { propertyService } from "./property.service";
import { ensureEstateForPropertyId } from "./estate-property-link.service";
import { getGhanaRegion } from "./ghana-regions";
import { propertyMediaService } from "./property-media.service";
import { listingQualityService, type ListingQualityReport } from "./listing-quality.service";
import { validatePropertyLocationForPublish } from "./property-jurisdiction-validation";

type ListingProperty = {
  media?: Database["public"]["Tables"]["property_media"]["Row"][] | null;
};

type ListingWithProperty = {
  property?: ListingProperty | ListingProperty[] | null;
};

async function resolveListingPropertyMedia<T extends ListingWithProperty>(listing: T): Promise<T> {
  const property = Array.isArray(listing.property) ? listing.property[0] : listing.property;
  if (!property?.media?.length) return listing;

  const resolvedMedia = await propertyMediaService.resolvePropertyMediaItems(property.media);
  if (Array.isArray(listing.property)) {
    return { ...listing, property: [{ ...property, media: resolvedMedia }] };
  }
  return { ...listing, property: { ...property, media: resolvedMedia } };
}

async function resolveListingsPropertyMedia<T extends ListingWithProperty>(
  listings: T[]
): Promise<T[]> {
  return Promise.all(listings.map((listing) => resolveListingPropertyMedia(listing)));
}

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

export function assertListingReadyForPublication(input: {
  listing: Record<string, any>;
  property: Record<string, any>;
  mediaCount: number;
}) : ListingQualityReport {
  const location = validatePropertyLocationForPublish({
    country: input.property.country,
    region: input.property.region,
    city: input.property.city,
    subdivision_code: input.property.subdivision_code,
    address: input.property.address,
    ghana_post_gps: input.property.ghana_post_gps,
  });
  if (!location.valid) throw new Error(`Listing cannot be published: ${location.errors.join(" ")}`);

  const report = listingQualityService.evaluateListing({
    ...input.listing,
    quality_breakdown: {
      ...(input.listing.quality_breakdown || {}),
      titleDocumentStatus: input.listing.title_document_status,
    },
    property: { ...input.property, media: Array.from({ length: input.mediaCount }, () => ({})) },
  });
  const blocking = report.checks.filter((check) => check.status === "failed");
  if (blocking.length) {
    throw new Error(`Listing cannot be published: ${blocking.map((check) => check.label).join(", ")}`);
  }
  return report;
}

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
    return resolveListingsPropertyMedia(data || []);
  },

  async getPublicListingByPropertyId(propertyId: string) {
    const { data, error } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("property_id", propertyId)
      .eq("status", "listed")
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;
    return resolveListingPropertyMedia(data);
  },

  async searchListings(
    filters: {
      location?: string;
      bounds?: SearchBounds;
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
      bounds?: SearchBounds;
      priceMin?: number;
      priceMax?: number;
      bedrooms?: number;
      bathrooms?: number;
      propertyType?: string;
      listingType?: string;
      organizationSlug?: string;
      region?: string;
      country?: string;
      sort?: "newest" | "price_asc" | "price_desc" | "featured";
      verifiedOnly?: boolean;
      featuredOnly?: boolean;
      amenities?: string[];
      currency?: string;
    },
    limit = 20,
    offset = 0
  ) {
    const normalizedPropertyType = normalizePropertyCategory(filters.propertyType);
    const region = filters.region && filters.region !== "all"
      ? getGhanaRegion(filters.region)?.label ?? filters.region.replace(/_/g, " ")
      : null;
    const pageLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
    const pageOffset = Math.max(0, Math.trunc(offset));

    // The RPC returns only RLS-authorized public IDs and an exact count.
    // Fetching one bounded page avoids the default PostgREST row cap and
    // prevents client-side filtering of stale/incomplete catalog snapshots.
    const { data, error } = await supabase.rpc("search_public_listing_ids", {
      p_location: filters.location?.trim() || null,
      p_bounds: filters.bounds ? { ...filters.bounds } : null,
      p_price_min: filters.priceMin ?? null,
      p_price_max: filters.priceMax ?? null,
      p_bedrooms: filters.bedrooms ?? null,
      p_bathrooms: filters.bathrooms ?? null,
      p_property_type: normalizedPropertyType ?? null,
      p_listing_type: filters.listingType || null,
      p_organization_slug: filters.organizationSlug || null,
      p_region: region,
      p_country: filters.country || null,
      p_sort: filters.sort || "newest",
      p_verified_only: filters.verifiedOnly ?? false,
      p_featured_only: filters.featuredOnly ?? false,
      p_amenities: filters.amenities || [],
      p_currency: filters.currency || null,
      p_limit: pageLimit,
      p_offset: pageOffset,
    });
    if (error) throw error;

    const response = data as { ids?: unknown; total?: unknown } | null;
    if (!response || !Array.isArray(response.ids) ||
        !response.ids.every((value) => typeof value === "string" && /^[a-f0-9-]{36}$/i.test(value)) ||
        typeof response.total !== "number" || !Number.isSafeInteger(response.total) || response.total < 0) {
      throw new Error("Unexpected server search response");
    }

    const ids = response.ids as string[];
    if (!ids.length) return { results: [], total: response.total };

    const { data: pageData, error: pageError } = await supabase
      .from("listings")
      .select(LISTING_SELECT)
      .eq("status", "listed")
      .eq("visibility", "public")
      .in("id", ids);
    if (pageError) throw pageError;

    const byId = new Map((pageData || []).map((listing) => [listing.id, listing]));
    const orderedPage = ids.map((id) => byId.get(id)).filter(
      (listing): listing is NonNullable<typeof listing> => Boolean(listing)
    );
    return {
      results: await resolveListingsPropertyMedia(orderedPage),
      total: response.total,
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
        currency: listing.currency || undefined,
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

  async getPublicShortlist(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await supabase.from("listings").select(LISTING_SELECT).in("id", ids.slice(0, 12)).eq("status", "listed").eq("visibility", "public");
    if (error) throw error;
    return resolveListingsPropertyMedia(data || []);
  },
  async confirmAvailability(id: string) {
    const current = await this.getListingById(id);
    const details = current.quality_breakdown && typeof current.quality_breakdown === "object" && !Array.isArray(current.quality_breakdown) ? current.quality_breakdown : {};
    let query = supabase.from("listings").update({ quality_breakdown: { ...details, availabilityConfirmedAt: new Date().toISOString() } }).eq("id", id);
    if (current.updated_at) query = query.eq("updated_at", current.updated_at);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("The listing changed or you do not have permission. Refresh and retry.");
    return data;
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
    return resolveListingPropertyMedia(data);
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
    return resolveListingsPropertyMedia(data || []);
  },

  async createListing(listing: ListingInsert) {
    const { data, error } = await supabase.from("listings").insert(listing).select();

    if (error) throw error;
    const created = data[0];
    if (created?.property_id) {
      try {
        await ensureEstateForPropertyId(created.property_id);
      } catch (linkError) {
        console.error("Failed to auto-link listing property to managed estate:", linkError);
      }
    }
    return created;
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

  async publishListing(id: string) {
    const { data, error } = await supabase
      .from("listings")
      .select("*, property:properties(*, media:property_media(*))")
      .eq("id", id)
      .single();
    if (error) throw error;
    const property = Array.isArray(data.property) ? data.property[0] : data.property;
    if (!property) throw new Error("Listing cannot be published without a property");
    const mediaCount = Array.isArray(property.media) ? property.media.length : 0;
    const report = assertListingReadyForPublication({ listing: data, property, mediaCount });
    const { data: published, error: publishError } = await supabase
      .from("listings")
      .update({
        status: "listed",
        visibility: "public",
        published_at: new Date().toISOString(),
        quality_score: report.score,
        quality_breakdown: { ...(data.quality_breakdown && typeof data.quality_breakdown === "object" && !Array.isArray(data.quality_breakdown) ? data.quality_breakdown : {}), checks: report.checks, evaluatedAt: new Date().toISOString() },
        last_quality_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();
    if (publishError) throw publishError;
    return published;
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
