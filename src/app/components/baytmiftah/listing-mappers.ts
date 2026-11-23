import { getPropertyImageGallery } from "../../../lib/property-media";
import { formatMoneyMajor } from "../../../lib/currency-format";
import { buildPropertyComplianceSnapshot } from "../../../lib/property-country-context.service";
import { normalizeMatterportTourUrl } from "../../../lib/virtual-tour";

export interface MarketplaceListingCard {
  id: string;
  title: string;
  location: string;
  priceLabel: string;
  listingType: "rent" | "sale" | "lease" | "stay";
  bedrooms?: number;
  rating: string | null;
  photos: string[];
  featured?: boolean;
  verified?: boolean;
  has3DTour?: boolean;
  type?: string;
  marketLabel?: string;
  currency?: string;
}

export interface MapListing extends MarketplaceListingCard {
  lat?: number | null;
  lng?: number | null;
  distanceLabel?: string;
  locationNote?: string;
}

function formatPriceLabel(listing: {
  price?: number | null;
  currency?: string | null;
  listing_type?: string | null;
}) {
  const price = Number(listing.price) || 0;
  const currency = listing.currency || "GHS";
  const suffix =
    listing.listing_type === "rental"
      ? "/mo"
      : listing.listing_type === "short_stay"
        ? "/night"
        : "";
  return `${formatMoneyMajor(price, currency)}${suffix}`;
}

export function mapListingToCard(listing: any): MarketplaceListingCard {
  const property = listing.property || {};
  const location =
    [property.neighborhood, property.city, property.region].filter(Boolean).join(", ") ||
    property.address ||
    "Ghana";

  const listingType =
    listing.listing_type === "sale"
      ? "sale"
      : listing.listing_type === "lease"
        ? "lease"
        : listing.listing_type === "short_stay"
          ? "stay"
          : "rent";

  const compliance = buildPropertyComplianceSnapshot({
    country: property.country,
    region: property.region,
    city: property.city,
    subdivision_code: property.subdivision_code,
    currency: listing.currency,
  });

  return {
    id: listing.id,
    title: property.address || "Property",
    location,
    priceLabel: formatPriceLabel(listing),
    listingType,
    marketLabel: compliance.subdivisionLabel || compliance.context.pack.label,
    currency: listing.currency || compliance.context.currency,
    bedrooms: property.bedrooms ?? undefined,
    rating: Number.isFinite(Number(listing.rating_avg)) && Number(listing.rating_count) > 0
      ? Number(listing.rating_avg).toFixed(1)
      : null,
    photos: getPropertyImageGallery(property),
    has3DTour: Boolean(normalizeMatterportTourUrl(property.virtual_tour_url)),
    featured: (listing.quality_score || 0) >= 75,
    verified: listing.organization?.verified,
    type: property.category,
  };
}

export function mapListingToMapListing(listing: any): MapListing {
  const card = mapListingToCard(listing);
  const property = listing.property || {};
  const latitude = Number(property.latitude);
  const longitude = Number(property.longitude);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return {
      ...card,
      lat: latitude,
      lng: longitude,
      locationNote: "Location supplied by advertiser. Confirm before travelling.",
    };
  }

  // A city-centre pin with ID-based random jitter would falsely imply the
  // listing is located at a specific street address. Omit unmapped listings.
  return {
    ...card,
    lat: null,
    lng: null,
    locationNote: "Address location not provided.",
  };
}
