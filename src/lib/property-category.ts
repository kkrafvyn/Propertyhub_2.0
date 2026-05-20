export const PROPERTY_CATEGORIES = [
  "apartment",
  "house",
  "office",
  "commercial",
  "warehouse",
  "car_park",
  "office_complex",
  "land",
] as const;

export type BaytMiftahPropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export const PROPERTY_CATEGORY_LABELS: Record<BaytMiftahPropertyCategory, string> = {
  apartment: "Apartment",
  house: "House",
  office: "Office",
  commercial: "Commercial",
  warehouse: "Warehouse",
  car_park: "Car Park",
  office_complex: "Office Complex",
  land: "Land",
};

export const PROPERTY_CATEGORY_OPTIONS = PROPERTY_CATEGORIES.map((value) => ({
  value,
  label: PROPERTY_CATEGORY_LABELS[value],
}));

const PROPERTY_CATEGORY_ALIASES: Record<string, BaytMiftahPropertyCategory> = {
  apartment: "apartment",
  apartments: "apartment",
  flat: "apartment",
  flats: "apartment",
  condo: "apartment",
  condos: "apartment",
  house: "house",
  houses: "house",
  home: "house",
  homes: "house",
  villa: "house",
  villas: "house",
  duplex: "house",
  duplexes: "house",
  office: "office",
  offices: "office",
  workspace: "office",
  workspaces: "office",
  commercial: "commercial",
  commercials: "commercial",
  shop: "commercial",
  shops: "commercial",
  retail: "commercial",
  "retail space": "commercial",
  warehouse: "warehouse",
  warehouses: "warehouse",
  storage: "warehouse",
  logistics: "warehouse",
  "logistics hub": "warehouse",
  "car park": "car_park",
  "car parks": "car_park",
  carpark: "car_park",
  carparks: "car_park",
  parking: "car_park",
  "parking lot": "car_park",
  "parking lots": "car_park",
  "office complex": "office_complex",
  "office complexes": "office_complex",
  "business park": "office_complex",
  "business parks": "office_complex",
  "corporate campus": "office_complex",
  "corporate campuses": "office_complex",
  land: "land",
  lands: "land",
  plot: "land",
  plots: "land",
};

const IOT_HINTS: Record<
  BaytMiftahPropertyCategory | "default",
  {
    title: string;
    description: string;
    devices: string[];
  }
> = {
  apartment: {
    title: "Apartment smart access",
    description: "Best for controlled viewing entry, tenant handoff, and utility monitoring.",
    devices: ["Smart lock", "Door sensor", "Motion sensor", "Energy monitor"],
  },
  house: {
    title: "House smart access",
    description: "Secure exterior gates, front doors, and vacant-home monitoring.",
    devices: ["Gate access", "Smart lock", "Door sensor", "Smart meter"],
  },
  office: {
    title: "Office smart access",
    description: "Manage suite entry, staff or broker access windows, and usage visibility.",
    devices: ["Smart lock", "Occupancy counter", "Energy monitor", "CCTV link"],
  },
  commercial: {
    title: "Commercial smart access",
    description: "Support shops, retail units, and mixed commercial spaces with auditable entry.",
    devices: ["Gate access", "Smart lock", "CCTV link", "Energy monitor"],
  },
  warehouse: {
    title: "Warehouse smart access",
    description: "Control loading bays, dock doors, service gates, and vacant warehouse security.",
    devices: ["Dock door", "Warehouse sensor", "Gate access", "CCTV link"],
  },
  car_park: {
    title: "Car park smart access",
    description: "Issue time-limited parking entry codes and monitor capacity or gate activity.",
    devices: ["Parking gate", "Occupancy counter", "CCTV link", "Smart meter"],
  },
  office_complex: {
    title: "Office complex smart access",
    description: "Coordinate lobby access, tenant keys, parking entry, and shared-area monitoring.",
    devices: ["Gate access", "Smart lock", "Parking gate", "Occupancy counter"],
  },
  land: {
    title: "Land parcel access",
    description: "Use access gates and field sensors where the parcel has controlled entry points.",
    devices: ["Gate access", "Motion sensor", "CCTV link"],
  },
  default: {
    title: "Smart property access",
    description: "Add provider-neutral locks, gates, meters, and sensors for this listing.",
    devices: ["Smart lock", "Gate access", "Energy monitor"],
  },
};

function normalizeAliasKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function normalizePropertyCategory(value?: string | null): string | undefined {
  if (!value) return undefined;

  const normalized = normalizeAliasKey(value);
  return PROPERTY_CATEGORY_ALIASES[normalized] ?? value.trim().toLowerCase();
}

export function formatPropertyCategory(value?: string | null) {
  const normalized = normalizePropertyCategory(value) as BaytMiftahPropertyCategory | undefined;
  if (normalized && normalized in PROPERTY_CATEGORY_LABELS) {
    return PROPERTY_CATEGORY_LABELS[normalized];
  }

  if (!value) return "Property";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getPropertyCategoryIoTHints(value?: string | null) {
  const normalized = normalizePropertyCategory(value) as BaytMiftahPropertyCategory | undefined;
  return normalized && normalized in IOT_HINTS ? IOT_HINTS[normalized] : IOT_HINTS.default;
}
