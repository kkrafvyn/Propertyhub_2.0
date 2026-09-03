import type { LeaseRuleSet, TaxComponent } from "./country-rules/types";

export type GhanaSubdivisionOverlay = {
  code: string;
  label: string;
  leaseRules?: Partial<LeaseRuleSet>;
  taxProfile?: TaxComponent[];
};

export interface GhanaRegion {
  code: string;
  label: string;
  capital: string;
  matchTerms: string[];
  leaseRules?: Partial<LeaseRuleSet>;
  taxProfile?: TaxComponent[];
}

/** Approximate map coordinates for regional capitals (lat, lng). */
export const GHANA_CITY_COORDS: Record<string, [number, number]> = {
  accra: [5.6037, -0.187],
  kumasi: [6.6885, -1.6244],
  "sekondi-takoradi": [4.8845, -1.7554],
  takoradi: [4.8845, -1.7554],
  sekondi: [4.8845, -1.7554],
  "sefwi wiawso": [6.2, -2.483],
  wiawso: [6.2, -2.483],
  "cape coast": [5.1053, -1.2466],
  koforidua: [6.094, -0.2577],
  ho: [6.6118, 0.4703],
  dambai: [8.0667, 0.1833],
  tamale: [9.4034, -0.8424],
  nalerigu: [10.5167, -0.3167],
  bolgatanga: [10.7856, -0.8514],
  wa: [10.0601, -2.5099],
  damongo: [9.0833, -1.8167],
  sunyani: [7.3399, -2.3268],
  techiman: [7.5906, -1.9397],
  goaso: [6.8036, -2.5172],
  tema: [5.6698, -0.0167],
};

/** All 16 administrative regions of Ghana (2026). */
export const GHANA_REGIONS: GhanaRegion[] = [
  {
    code: "AA",
    label: "Greater Accra",
    capital: "Accra",
    matchTerms: ["greater accra", "accra", "tema", "madina", "ashaiman"],
    leaseRules: {
      rentControlApplies: true,
      statutoryReferences: [
        "Rent Control Act 1963 (Act 220) — Accra/Tema designated areas",
        "Greater Accra rent tribunal",
      ],
      requiredLeaseClauses: ["Advance rent cap where rent control applies", "GhanaPostGPS on lease schedule"],
      maxAdvanceRentMonths: 6,
      maxSecurityDepositMonths: 3,
      minNoticeDaysLandlord: 90,
    },
    taxProfile: [
      {
        id: "stamp_duty",
        label: "Stamp duty (Greater Accra lease)",
        rateBasisPoints: 50,
        appliesTo: ["sale"],
        authority: "GRA",
        notes: "0.5% on sale; lease stamp varies by instrument",
      },
    ],
  },
  {
    code: "AS",
    label: "Ashanti",
    capital: "Kumasi",
    matchTerms: ["ashanti", "kumasi", "obuasi", "ejisu"],
    leaseRules: {
      statutoryReferences: ["Ashanti Regional rent practice", "Kumasi Metropolitan Assembly bylaws"],
      maxAdvanceRentMonths: 12,
      minNoticeDaysLandlord: 60,
    },
  },
  {
    code: "WE",
    label: "Western",
    capital: "Sekondi-Takoradi",
    matchTerms: ["western region", "takoradi", "sekondi", "tarkwa", "sekondi-takoradi"],
    leaseRules: {
      statutoryReferences: ["Western Region tenancy practice", "Takoradi/Sekondi port-area leases"],
      minNoticeDaysLandlord: 60,
    },
  },
  {
    code: "WN",
    label: "Western North",
    capital: "Sefwi Wiawso",
    matchTerms: ["western north", "sefwi", "wiawso", "bibiani"],
  },
  {
    code: "CP",
    label: "Central",
    capital: "Cape Coast",
    matchTerms: ["central region", "cape coast", "winneba", "kasoa"],
    leaseRules: {
      statutoryReferences: ["Central Region customary land tenure disclosures", "Cape Coast municipality rules"],
      minNoticeDaysLandlord: 60,
    },
  },
  {
    code: "ER",
    label: "Eastern",
    capital: "Koforidua",
    matchTerms: ["eastern region", "koforidua", "akosombo", "nsawam"],
    leaseRules: {
      statutoryReferences: ["Eastern Region land documentation", "Koforidua tenancy practice"],
      minNoticeDaysLandlord: 60,
    },
  },
  {
    code: "VO",
    label: "Volta",
    capital: "Ho",
    matchTerms: ["volta region", "volta", "ho", "hohoe", "keta"],
  },
  {
    code: "OT",
    label: "Oti",
    capital: "Dambai",
    matchTerms: ["oti region", "oti", "dambai", "krachi"],
  },
  {
    code: "NR",
    label: "Northern",
    capital: "Tamale",
    matchTerms: ["northern region", "tamale", "yendi"],
    leaseRules: {
      statutoryReferences: ["Northern Region customary tenancy", "Tamale rent dispute resolution"],
      minNoticeDaysLandlord: 90,
    },
  },
  {
    code: "NE",
    label: "North East",
    capital: "Nalerigu",
    matchTerms: ["north east", "nalerigu", "walewale"],
  },
  {
    code: "UE",
    label: "Upper East",
    capital: "Bolgatanga",
    matchTerms: ["upper east", "bolgatanga", "bawku"],
  },
  {
    code: "UW",
    label: "Upper West",
    capital: "Wa",
    matchTerms: ["upper west", "wa", "lawra"],
  },
  {
    code: "SV",
    label: "Savannah",
    capital: "Damongo",
    matchTerms: ["savannah region", "savannah", "damongo", "salaga"],
  },
  {
    code: "BO",
    label: "Bono",
    capital: "Sunyani",
    matchTerms: ["bono region", "bono", "sunyani", "dormaa"],
  },
  {
    code: "BE",
    label: "Bono East",
    capital: "Techiman",
    matchTerms: ["bono east", "techiman", "kintampo"],
  },
  {
    code: "AH",
    label: "Ahafo",
    capital: "Goaso",
    matchTerms: ["ahafo", "goaso", "bechem"],
  },
];

const DEFAULT_GH_LEASE: Partial<LeaseRuleSet> = {
  statutoryReferences: ["Ghana Rent Control Act 1963 (Act 220) where applicable", "Land Act 2020 (Act 1036)"],
  requiredLeaseClauses: ["GhanaPostGPS on lease schedule where available"],
  minNoticeDaysLandlord: 60,
};

export const GHANA_SUBDIVISION_OVERLAYS: Record<string, GhanaSubdivisionOverlay> = Object.fromEntries(
  GHANA_REGIONS.map((region) => [
    region.code,
    {
      code: region.code,
      label: region.label,
      leaseRules: { ...DEFAULT_GH_LEASE, ...region.leaseRules },
      taxProfile: region.taxProfile,
    },
  ])
);

export const GHANA_REGION_ALIASES: Record<string, string> = GHANA_REGIONS.reduce(
  (aliases, region) => {
    aliases[region.label.toUpperCase()] = region.code;
    aliases[region.capital.toUpperCase()] = region.code;
    for (const term of region.matchTerms) {
      aliases[term.toUpperCase()] = region.code;
    }
    return aliases;
  },
  {} as Record<string, string>
);

export function getGhanaRegion(code?: string | null): GhanaRegion | undefined {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || normalized === "ALL") return undefined;
  return GHANA_REGIONS.find((region) => region.code === normalized);
}

export function resolveGhanaRegionCode(
  propertyRegion?: string | null,
  propertyCity?: string | null
): string | undefined {
  const tokens = [propertyRegion, propertyCity]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,/]/))
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);

  for (const token of tokens) {
    if (GHANA_REGION_ALIASES[token]) return GHANA_REGION_ALIASES[token];
  }

  for (const region of GHANA_REGIONS) {
    const label = region.label.toUpperCase();
    for (const token of tokens) {
      if (token.includes(label) || label.includes(token)) return region.code;
    }
  }

  return undefined;
}

export function propertyMatchesGhanaRegion(
  propertyRegion: string | null | undefined,
  propertyCity: string | null | undefined,
  propertyAddress: string | null | undefined,
  selectedRegionCode?: string | null
): boolean {
  if (!selectedRegionCode || selectedRegionCode === "all") return true;

  const selected = selectedRegionCode.trim().toUpperCase();
  const resolved = resolveGhanaRegionCode(propertyRegion, propertyCity);
  if (resolved) return resolved === selected;

  const region = getGhanaRegion(selected);
  if (!region) return true;

  const haystack = [propertyRegion, propertyCity, propertyAddress]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (haystack.includes(region.label.toLowerCase())) return true;

  const sortedTerms = [...region.matchTerms].sort((a, b) => b.length - a.length);
  return sortedTerms.some((term) => haystack.includes(term.toLowerCase()));
}
