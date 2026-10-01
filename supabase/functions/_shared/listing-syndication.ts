export type ListingProvider = "mls" | "zillow" | "realtor";

export type ListingProviderConfig = {
  provider: ListingProvider;
  url: string;
  apiKey: string;
  authMode: "x-api-key" | "bearer" | "query";
  keyHeader: string;
  keyQueryParam: string;
};

export type NormalizedExternalListing = {
  external_id: string;
  provider: ListingProvider;
  title: string;
  description: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  property_type: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number;
  longitude: number;
  square_feet: number | null;
  images: string[];
  agent_name: string | null;
  agent_email: string | null;
  agent_phone: string | null;
  list_date: string | null;
  sale_date: string | null;
  status: "active" | "pending" | "sold" | "expired";
  raw_data: Record<string, unknown>;
};

type EnvReader = (name: string) => string | undefined;

const PROVIDER_PREFIX: Record<ListingProvider, string> = {
  mls: "MLS",
  zillow: "ZILLOW",
  realtor: "REALTOR",
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function optionalNumber(...values: unknown[]) {
  const value = numberValue(...values);
  return value > 0 ? value : null;
}

function squareFeetValue(item: Record<string, unknown>) {
  const value = optionalNumber(item.squareFeet, item.sqft, item.LivingArea, item.livingArea);
  if (value == null) return null;
  const unit = clean(item.areaUnit).toLowerCase();
  return unit.includes("m²") || unit.includes("sqm") || unit.includes("square meter")
    ? Math.round(value * 10.7639)
    : Math.round(value);
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function getListingProviderConfig(
  provider: ListingProvider,
  readEnv: EnvReader = (name) => Deno.env.get(name),
): ListingProviderConfig | null {
  const prefix = PROVIDER_PREFIX[provider];
  const apiKey = clean(readEnv(`${prefix}_API_KEY`));
  const rawUrl = clean(readEnv(`${prefix}_FEED_URL`) || readEnv(`${prefix}_API_URL`));
  if (!apiKey || !rawUrl) return null;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`${prefix}_FEED_URL must be a valid HTTPS URL`);
  }
  if (url.protocol !== "https:") {
    throw new Error(`${prefix}_FEED_URL must use HTTPS`);
  }

  const requestedMode = clean(readEnv(`${prefix}_AUTH_MODE`)).toLowerCase();
  const authMode = requestedMode || "x-api-key";
  if (!(["x-api-key", "bearer", "query"] as string[]).includes(authMode)) {
    throw new Error(`${prefix}_AUTH_MODE must be x-api-key, bearer, or query`);
  }

  return {
    provider,
    url: url.toString(),
    apiKey,
    authMode: authMode as ListingProviderConfig["authMode"],
    keyHeader: clean(readEnv(`${prefix}_API_KEY_HEADER`)) || "X-API-Key",
    keyQueryParam: clean(readEnv(`${prefix}_API_KEY_QUERY_PARAM`)) || "api_key",
  };
}

export function buildListingProviderRequest(config: ListingProviderConfig) {
  const url = new URL(config.url);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.authMode === "bearer") headers.Authorization = `Bearer ${config.apiKey}`;
  if (config.authMode === "x-api-key") headers[config.keyHeader] = config.apiKey;
  if (config.authMode === "query") url.searchParams.set(config.keyQueryParam, config.apiKey);
  return { url: url.toString(), headers };
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const object = objectValue(payload);
  const candidates = [
    object.listings,
    object.results,
    object.data,
    object.value,
    object.items,
    object.properties,
    object.searchResults && objectValue(object.searchResults).listResults,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    const nested = objectValue(candidate);
    if (Array.isArray(nested.listings)) return nested.listings;
    if (Array.isArray(nested.results)) return nested.results;
    if (Array.isArray(nested.items)) return nested.items;
  }
  return [];
}

function normalizeStatus(item: Record<string, unknown>): NormalizedExternalListing["status"] {
  const value = clean(item.status || item.statusType || item.standardStatus).toLowerCase();
  if (value.includes("sold") || value.includes("closed")) return "sold";
  if (value.includes("pending") || value.includes("contract")) return "pending";
  if (value.includes("expired") || value.includes("withdrawn") || value.includes("cancel")) return "expired";
  return "active";
}

export function normalizeListingFeed(
  payload: unknown,
  provider: ListingProvider,
): NormalizedExternalListing[] {
  return extractRows(payload).slice(0, 5000).flatMap((raw, index) => {
    const item = objectValue(raw);
    const addressObject = objectValue(item.address);
    const sourceObject = objectValue(item.source);
    const priceObject = objectValue(item.price);
    const gpsObject = objectValue(item.gps);
    const id = clean(
      item.externalId || item.external_id || item.ListingKey || item.ListingId || item.listing_id ||
        item.zpid || item.property_id || item.id || sourceObject.localId || sourceObject.url,
    );
    if (!id) return [];

    const address = clean(
      addressObject.formattedAddress || addressObject.line || addressObject.street || item.UnparsedAddress ||
        item.address || item.title || item.StreetName,
    );
    const photos = Array.isArray(item.photos) ? item.photos : [];
    const rawImages = Array.isArray(item.images)
      ? item.images
      : Array.isArray(item.pictures)
        ? item.pictures
        : photos;
    const images = rawImages.map((entry) => {
      if (typeof entry === "string") return entry;
      const image = objectValue(entry);
      return clean(image.href || image.url || image.Uri || image.MediaURL);
    }).filter(Boolean);

    const normalized: NormalizedExternalListing = {
      external_id: id.slice(0, 255) || `${provider}-${index}`,
      provider,
      title: clean(item.title || address || `Listing ${id}`),
      description: clean(item.description || item.shortDescription || item.PublicRemarks),
      price: numberValue(priceObject.value, item.price, item.list_price, item.ListPrice),
      currency: clean(priceObject.currency || item.currency || item.Currency) || "USD",
      bedrooms: numberValue(item.bedrooms, item.beds, item.BedroomsTotal),
      bathrooms: numberValue(item.bathrooms, item.baths, item.BathroomsTotalInteger, item.BathroomsTotal),
      property_type: clean(item.propertyType || item.property_type || item.prop_type || item.PropertyType) || "residential",
      address,
      city: clean(item.city || addressObject.city || item.City),
      state: clean(item.state || item.region || addressObject.state_code || addressObject.state || item.StateOrProvince),
      zip_code: clean(item.zipCode || item.postal_code || addressObject.postal_code || addressObject.zip || item.PostalCode),
      latitude: numberValue(item.latitude, item.lat, addressObject.lat, gpsObject.lat, item.Latitude),
      longitude: numberValue(item.longitude, item.lng, addressObject.lon, gpsObject.lng, item.Longitude),
      square_feet: squareFeetValue(item),
      images,
      agent_name: clean(item.agentName || objectValue(item.listingAgent).name || objectValue(item.list_agent).name) || null,
      agent_email: clean(item.agentEmail || objectValue(item.listingAgent).email || objectValue(item.list_agent).email) || null,
      agent_phone: clean(item.agentPhone || objectValue(item.listingAgent).phone || objectValue(item.list_agent).phone) || null,
      list_date: clean(item.listDate || item.list_date || item.ListingContractDate) || null,
      sale_date: clean(item.saleDate || item.sale_date || item.CloseDate) || null,
      status: normalizeStatus(item),
      raw_data: item,
    };
    return [normalized];
  });
}
