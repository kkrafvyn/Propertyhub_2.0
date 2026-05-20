import { supabase } from "./supabase";
import type { Database } from "./database.types";
import { formatPropertyCategory, normalizePropertyCategory } from "./property-category";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
type ListingUpdate = Database["public"]["Tables"]["listings"]["Update"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

export interface PublicCategorySummary {
  category: string;
  label: string;
  count: number;
}

export interface PublicLocationSummary {
  label: string;
  city: string;
  region: string;
  neighborhood: string | null;
  listingCount: number;
  averagePrice: number | null;
  startingPrice: number | null;
  listingTypes: Array<ListingRow["listing_type"]>;
}

const LISTING_SELECT = `
  *,
  property:properties(
    *,
    media:property_media(*)
  ),
  organization:organizations(name, slug, logo_url, verified)
`;

const LISTING_SEARCH_SELECT = `
  *,
  property:properties!inner(
    *,
    media:property_media(*)
  ),
  organization:organizations(name, slug, logo_url, verified)
`;

function normalizeLocationText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function sanitizePostgrestLikeQuery(value?: string | null) {
  const sanitized = String(value || "")
    .replace(/[,%(){}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || null;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function matchesLocationQuery(
  property:
    | Pick<
        Database["public"]["Tables"]["properties"]["Row"],
        "address" | "city" | "region" | "neighborhood" | "country" | "ghana_post_gps"
      >
    | null
    | undefined,
  query?: string | null
) {
  const normalizedQuery = normalizeLocationText(query);
  if (!normalizedQuery) return true;

  return [
    property?.address,
    property?.city,
    property?.region,
    property?.neighborhood,
    property?.country,
    property?.ghana_post_gps,
  ].some((value) => normalizeLocationText(value).includes(normalizedQuery));
}

function sortLocationSummaries(a: PublicLocationSummary, b: PublicLocationSummary) {
  if (b.listingCount !== a.listingCount) {
    return b.listingCount - a.listingCount;
  }

  return Number(b.averagePrice || 0) - Number(a.averagePrice || 0);
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
    const sanitizedLocation = sanitizePostgrestLikeQuery(filters.location);
    const requiresPropertySideFiltering = Boolean(
      sanitizedLocation ||
        normalizedPropertyType ||
        filters.bedrooms != null ||
        filters.bathrooms != null ||
        requiredAmenities.length > 0
    );

    let query = supabase
      .from("listings")
      .select(LISTING_SEARCH_SELECT, { count: "exact" })
      .eq("status", "listed")
      .eq("visibility", "public")
      .order("published_at", { ascending: false });

    if (filters.priceMin != null) {
      query = query.gte("price", filters.priceMin);
    }

    if (filters.priceMax != null) {
      query = query.lte("price", filters.priceMax);
    }

    if (filters.listingType) {
      query = query.eq("listing_type", filters.listingType);
    }

    if (!requiresPropertySideFiltering) {
      const { data, error, count } = await query.range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        results: data || [],
        total: count || 0,
      };
    }

    // Public search stays reliable by filtering embedded property fields client-side
    // after fetching a broader backend-backed candidate set.
    const candidateWindow = Math.max(offset + limit, 120);
    const { data, error } = await query.range(0, candidateWindow - 1);

    if (error) throw error;

    const propertyFilteredResults = (data || []).filter((listing) => {
      const property = listing.property as Database["public"]["Tables"]["properties"]["Row"] | null;
      const normalizedCategory = normalizePropertyCategory(property?.category);
      const listingAmenities = (property?.amenities || []).map((amenity) =>
        amenity.trim().toLowerCase()
      );

      if (normalizedPropertyType && normalizedCategory !== normalizedPropertyType) {
        return false;
      }

      if (filters.bedrooms != null && Number(property?.bedrooms || 0) < filters.bedrooms) {
        return false;
      }

      if (filters.bathrooms != null && Number(property?.bathrooms || 0) < filters.bathrooms) {
        return false;
      }

      if (!matchesLocationQuery(property, sanitizedLocation)) {
        return false;
      }

      return requiredAmenities.every((amenity) => listingAmenities.includes(amenity));
    });

    const total = propertyFilteredResults.length;

    return {
      results: propertyFilteredResults.slice(offset, offset + limit),
      total,
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

  async getPublicCategorySummaries(limit = 8) {
    const { data, error } = await supabase
      .from("listings")
      .select("property:properties!inner(category)")
      .eq("status", "listed")
      .eq("visibility", "public");

    if (error) throw error;

    const counts = new Map<string, number>();

    (data || []).forEach((listing) => {
      const property = listing.property as Pick<
        Database["public"]["Tables"]["properties"]["Row"],
        "category"
      > | null;
      const category = normalizePropertyCategory(property?.category) || "other";
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([category, count]) => ({
        category,
        label: formatPropertyCategory(category),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit) satisfies PublicCategorySummary[];
  },

  async getPopularLocations(limit = 6, query?: string) {
    const sanitizedLocation = sanitizePostgrestLikeQuery(query);

    let listingQuery = supabase
      .from("listings")
      .select("price, listing_type, property:properties!inner(city, region, neighborhood, address, country, ghana_post_gps)")
      .eq("status", "listed")
      .eq("visibility", "public");

    if (sanitizedLocation) {
      listingQuery = listingQuery.or(
        [
          `address.ilike.%${sanitizedLocation}%`,
          `city.ilike.%${sanitizedLocation}%`,
          `region.ilike.%${sanitizedLocation}%`,
          `neighborhood.ilike.%${sanitizedLocation}%`,
          `country.ilike.%${sanitizedLocation}%`,
          `ghana_post_gps.ilike.%${sanitizedLocation}%`,
        ].join(","),
        { foreignTable: "properties" }
      );
    }

    const { data, error } = await listingQuery;

    if (error) throw error;

    const locations = new Map<
      string,
      {
        city: string;
        region: string;
        neighborhood: string | null;
        prices: number[];
        listingTypes: Set<ListingRow["listing_type"]>;
        listingCount: number;
      }
    >();

    (data || []).forEach((listing) => {
      const property = listing.property as Pick<
        Database["public"]["Tables"]["properties"]["Row"],
        "city" | "region" | "neighborhood"
      > | null;

      const city = property?.city?.trim();
      const region = property?.region?.trim();

      if (!city || !region) return;

      const neighborhood = property?.neighborhood?.trim() || null;
      const key = normalizeLocationText([neighborhood || city, city, region].join("::"));
      const current =
        locations.get(key) ||
        {
          city,
          region,
          neighborhood,
          prices: [],
          listingTypes: new Set<ListingRow["listing_type"]>(),
          listingCount: 0,
        };

      current.listingCount += 1;
      current.listingTypes.add(listing.listing_type);

      if (Number(listing.price) > 0) {
        current.prices.push(Number(listing.price));
      }

      locations.set(key, current);
    });

    return [...locations.values()]
      .map((location) => ({
        label: location.neighborhood
          ? `${location.neighborhood}, ${location.city}`
          : `${location.city}, ${location.region}`,
        city: location.city,
        region: location.region,
        neighborhood: location.neighborhood,
        listingCount: location.listingCount,
        averagePrice: average(location.prices),
        startingPrice: location.prices.length ? Math.min(...location.prices) : null,
        listingTypes: [...location.listingTypes],
      }))
      .sort(sortLocationSummaries)
      .slice(0, limit) satisfies PublicLocationSummary[];
  },

  async getLocationSuggestions(query: string, limit = 6) {
    const suggestions = await this.getPopularLocations(Math.max(limit * 2, limit), query);
    const normalizedQuery = normalizeLocationText(query);

    return suggestions
      .sort((a, b) => {
        const aStartsWith = normalizeLocationText(a.label).startsWith(normalizedQuery);
        const bStartsWith = normalizeLocationText(b.label).startsWith(normalizedQuery);

        if (aStartsWith !== bStartsWith) {
          return aStartsWith ? -1 : 1;
        }

        return sortLocationSummaries(a, b);
      })
      .slice(0, limit);
  },
};
