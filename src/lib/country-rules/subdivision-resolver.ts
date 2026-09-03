import type { CountryCode } from "./types";
import { SUBDIVISION_OVERLAYS } from "./subdivisions";

/** Maps region/city names (uppercase) to subdivision codes per jurisdiction. */
const REGION_ALIASES: Partial<Record<CountryCode, Record<string, string>>> = {
  GH: {
    "GREATER ACCRA": "AA",
    ACCRA: "AA",
    ASHANTI: "AS",
    KUMASI: "AS",
    WESTERN: "WE",
    TAKORADI: "WE",
    "CENTRAL REGION": "CP",
    CAPE: "CP",
    "EASTERN REGION": "ER",
    "NORTHERN REGION": "NR",
  },
  NG: {
    LAGOS: "LA",
    FCT: "FC",
    "FEDERAL CAPITAL TERRITORY": "FC",
    ABUJA: "FC",
    RIVERS: "RI",
    "PORT HARCOURT": "RI",
    OGUN: "OG",
    KANO: "KN",
  },
  KE: {
    NAIROBI: "NBI",
    "NAIROBI COUNTY": "NBI",
    MOMBASA: "MSA",
    COAST: "MSA",
    "MOMBASA COUNTY": "MSA",
    KISUMU: "KIS",
    NAKURU: "NKR",
    KIAMBU: "KMB",
    THIKA: "KMB",
  },
  ZA: {
    GAUTENG: "GT",
    JOHANNESBURG: "GT",
    PRETORIA: "GT",
    "WESTERN CAPE": "WC",
    "CAPE TOWN": "WC",
    "KWAZULU-NATAL": "KZN",
    DURBAN: "KZN",
    "EASTERN CAPE": "EC",
    LIMPOPO: "LP",
    MPUMALANGA: "MP",
  },
  GB: {
    ENGLAND: "ENG",
    LONDON: "ENG",
    MANCHESTER: "ENG",
    SCOTLAND: "SCT",
    EDINBURGH: "SCT",
    GLASGOW: "SCT",
    WALES: "WLS",
    CARDIFF: "WLS",
    "NORTHERN IRELAND": "NIR",
    BELFAST: "NIR",
  },
  US: {
    CALIFORNIA: "CA",
    "NEW YORK": "NY",
    TEXAS: "TX",
    FLORIDA: "FL",
    WASHINGTON: "WA",
    ILLINOIS: "IL",
    MASSACHUSETTS: "MA",
    COLORADO: "CO",
    "NEW JERSEY": "NJ",
    GEORGIA: "GA",
    ARIZONA: "AZ",
    NEVADA: "NV",
    "NORTH CAROLINA": "NC",
    VIRGINIA: "VA",
    PENNSYLVANIA: "PA",
    OREGON: "OR",
  },
  CA: {
    ONTARIO: "ON",
    TORONTO: "ON",
    "BRITISH COLUMBIA": "BC",
    VANCOUVER: "BC",
    QUEBEC: "QC",
    MONTREAL: "QC",
    ALBERTA: "AB",
    CALGARY: "AB",
    MANITOBA: "MB",
    SASKATCHEWAN: "SK",
  },
  AU: {
    "NEW SOUTH WALES": "NSW",
    SYDNEY: "NSW",
    VICTORIA: "VIC",
    MELBOURNE: "VIC",
    QUEENSLAND: "QLD",
    BRISBANE: "QLD",
    "WESTERN AUSTRALIA": "WA",
    PERTH: "WA",
    "SOUTH AUSTRALIA": "SA",
    ADELAIDE: "SA",
  },
  AE: {
    DUBAI: "DXB",
    "ABU DHABI": "AUH",
    SHARJAH: "SHJ",
    AJMAN: "AJM",
  },
  EU: {
    GERMANY: "DE",
    BERLIN: "DE",
    FRANCE: "FR",
    PARIS: "FR",
    IRELAND: "IE",
    DUBLIN: "IE",
    NETHERLANDS: "NL",
    AMSTERDAM: "NL",
    SPAIN: "ES",
    MADRID: "ES",
    ITALY: "IT",
    ROME: "IT",
    PORTUGAL: "PT",
    LISBON: "PT",
    BELGIUM: "BE",
    BRUSSELS: "BE",
  },
  IN: {
    MAHARASHTRA: "MH",
    MUMBAI: "MH",
    DELHI: "DL",
    "NEW DELHI": "DL",
    KARNATAKA: "KA",
    BENGALURU: "KA",
    BANGALORE: "KA",
    "TAMIL NADU": "TN",
    CHENNAI: "TN",
    TELANGANA: "TG",
    HYDERABAD: "TG",
  },
};

/**
 * Resolve a subdivision code from free-text region/city (onboarding, property address, org default).
 */
export function resolveSubdivisionCode(
  jurisdictionId: CountryCode,
  region?: string | null,
  city?: string | null
): string | undefined {
  const aliases = REGION_ALIASES[jurisdictionId];
  if (!aliases) return undefined;

  const tokens = [region, city]
    .filter(Boolean)
    .flatMap((s) => String(s).split(/[,/]/))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  for (const token of tokens) {
    if (aliases[token]) return aliases[token];
    if (SUBDIVISION_OVERLAYS[jurisdictionId]?.[token]) return token;
  }

  for (const token of tokens) {
    for (const [alias, code] of Object.entries(aliases)) {
      if (token.includes(alias) || alias.includes(token)) return code;
    }
  }

  return undefined;
}

export function subdivisionLabel(
  jurisdictionId: CountryCode,
  subdivisionCode?: string | null
): string | undefined {
  const code = subdivisionCode?.trim().toUpperCase();
  if (!code) return undefined;
  return SUBDIVISION_OVERLAYS[jurisdictionId]?.[code]?.label;
}
