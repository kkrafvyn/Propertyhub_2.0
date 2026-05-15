export interface SearchShareInput {
  q?: string | null;
  listingType?: string | null;
  propertyType?: string | null;
  priceMin?: string | number | null;
  priceMax?: string | number | null;
  bedrooms?: string | number | null;
  bathrooms?: string | number | null;
  ref?: string | null;
  channel?: string | null;
  page?: string | number | null;
}

function appendIfPresent(
  params: URLSearchParams,
  key: string,
  value?: string | number | null
) {
  if (value == null) return;

  const normalized = String(value).trim();
  if (!normalized) return;
  params.set(key, normalized);
}

export function buildSearchParams(
  input: SearchShareInput,
  options?: { includePage?: boolean }
) {
  const params = new URLSearchParams();

  appendIfPresent(params, "q", input.q);
  appendIfPresent(params, "listingType", input.listingType || "rental");
  appendIfPresent(params, "propertyType", input.propertyType);
  appendIfPresent(params, "priceMin", input.priceMin);
  appendIfPresent(params, "priceMax", input.priceMax);
  appendIfPresent(params, "bedrooms", input.bedrooms);
  appendIfPresent(params, "bathrooms", input.bathrooms);
  appendIfPresent(params, "ref", input.ref);
  appendIfPresent(params, "channel", input.channel);

  if (options?.includePage) {
    appendIfPresent(params, "page", input.page);
  }

  return params;
}

export function buildSearchPath(
  input: SearchShareInput,
  options?: { includePage?: boolean }
) {
  const query = buildSearchParams(input, options).toString();
  return query ? `/search?${query}` : "/search";
}

export function buildAbsoluteSearchUrl(
  input: SearchShareInput,
  origin: string,
  options?: { includePage?: boolean }
) {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildSearchPath(input, options)}`;
}

export function buildAlertSearchInput(alert: any): SearchShareInput {
  return {
    q: alert.location_query || null,
    listingType: alert.listing_type || "rental",
    propertyType: alert.property_type || null,
    priceMin: alert.price_min ?? null,
    priceMax: alert.price_max ?? null,
    bedrooms: alert.bedrooms ?? null,
    bathrooms: alert.bathrooms ?? null,
  };
}

export function matchesAlertSearch(alert: any, input: SearchShareInput) {
  const comparableInput = {
    q: input.q,
    listingType: input.listingType,
    propertyType: input.propertyType,
    priceMin: input.priceMin,
    priceMax: input.priceMax,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
  } satisfies SearchShareInput;

  return (
    buildSearchParams(buildAlertSearchInput(alert)).toString() ===
    buildSearchParams(comparableInput).toString()
  );
}
