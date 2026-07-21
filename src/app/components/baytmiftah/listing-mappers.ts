import { getPropertyImageGallery } from "../../../lib/property-media";

export interface MarketplaceListingCard {
  id: string;
  title: string;
  location: string;
  priceLabel: string;
  listingType: "rent" | "sale" | "lease" | "stay";
  bedrooms?: number;
  rating: string;
  photos: string[];
  featured?: boolean;
  verified?: boolean;
  type?: string;
}

export interface MapListing extends MarketplaceListingCard {
  lat?: number | null;
  lng?: number | null;
  distanceLabel?: string;
}

const CITY_COORDS: Record<string, [number, number]> = {
  accra: [5.6037, -0.187],
  tema: [5.6698, -0.0167],
  kumasi: [6.6885, -1.6244],
  takoradi: [4.8845, -1.7554],
  cape: [5.1053, -1.2466],
  tamale: [9.4034, -0.8424],
};

function hashJitter(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % 1000;
  return [(hash % 100) / 5000 - 0.01, ((hash / 100) % 100) / 5000 - 0.01] as const;
}

function formatPriceLabel(listing: {
  price?: number | null;
  currency?: string | null;
  listing_type?: string | null;
}) {
  const price = Number(listing.price) || 0;
  const currency = listing.currency || "GHS";
  const prefix = currency === "GHS" ? "₵" : `${currency} `;
  const suffix =
    listing.listing_type === "rental"
      ? "/mo"
      : listing.listing_type === "short_stay"
        ? "/night"
        : "";
  return `${prefix}${price.toLocaleString()}${suffix}`;
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

  return {
    id: listing.id,
    title: property.address || "Property",
    location,
    priceLabel: formatPriceLabel(listing),
    listingType,
    bedrooms: property.bedrooms ?? undefined,
    rating: listing.quality_score ? (listing.quality_score / 20).toFixed(1) : "4.8",
    photos: getPropertyImageGallery(property),
    featured: (listing.quality_score || 0) >= 75,
    verified: listing.organization?.verified,
    type: property.category,
  };
}

export function mapListingToMapListing(listing: any): MapListing {
  const card = mapListingToCard(listing);
  const property = listing.property || {};
  const cityKey = String(property.city || "accra")
    .toLowerCase()
    .split(",")[0]
    .trim();
  const base = CITY_COORDS[cityKey] || CITY_COORDS.accra;
  const [dLat, dLng] = hashJitter(listing.id);

  return {
    ...card,
    lat: base[0] + dLat,
    lng: base[1] + dLng,
  };
}
