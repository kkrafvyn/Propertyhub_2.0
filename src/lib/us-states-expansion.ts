import type { LeaseRuleSet } from "./country-rules/types";
import type { GhanaSubdivisionOverlay } from "./ghana-regions";

type UsState = {
  code: string;
  label: string;
  capital: string;
  matchTerms: string[];
  leaseRules?: Partial<LeaseRuleSet>;
  taxBps?: number;
};

const defaultUsLease: Partial<LeaseRuleSet> = {
  statutoryReferences: ["State landlord-tenant statute applies"],
  requiredLeaseClauses: ["Security deposit terms and return timeline", "Notice periods per state law"],
  minNoticeDaysLandlord: 30,
};

function overlay(state: UsState): GhanaSubdivisionOverlay {
  return {
    code: state.code,
    label: state.label,
    leaseRules: { ...defaultUsLease, ...state.leaseRules },
    taxProfile:
      state.taxBps != null
        ? [
            {
              id: "state_sales_tax",
              label: `${state.label} sales tax (base)`,
              rateBasisPoints: state.taxBps,
              appliesTo: ["service_fee", "short_stay"],
            },
          ]
        : undefined,
  };
}

/** All 50 US states + DC with baseline overlays (detailed states merged in subdivisions.ts). */
export const US_STATE_CATALOG: UsState[] = [
  { code: "AL", label: "Alabama", capital: "Montgomery", matchTerms: ["alabama", "montgomery", "birmingham"] },
  { code: "AK", label: "Alaska", capital: "Juneau", matchTerms: ["alaska", "juneau", "anchorage"] },
  { code: "AZ", label: "Arizona", capital: "Phoenix", matchTerms: ["arizona", "phoenix", "tucson"], taxBps: 560 },
  { code: "AR", label: "Arkansas", capital: "Little Rock", matchTerms: ["arkansas", "little rock"] },
  { code: "CA", label: "California", capital: "Sacramento", matchTerms: ["california", "los angeles", "san francisco"], taxBps: 725 },
  { code: "CO", label: "Colorado", capital: "Denver", matchTerms: ["colorado", "denver"], taxBps: 290 },
  { code: "CT", label: "Connecticut", capital: "Hartford", matchTerms: ["connecticut", "hartford"] },
  { code: "DE", label: "Delaware", capital: "Dover", matchTerms: ["delaware", "dover", "wilmington"] },
  { code: "DC", label: "District of Columbia", capital: "Washington", matchTerms: ["district of columbia", "washington dc", "dc"] },
  { code: "FL", label: "Florida", capital: "Tallahassee", matchTerms: ["florida", "miami", "orlando"], taxBps: 600 },
  { code: "GA", label: "Georgia", capital: "Atlanta", matchTerms: ["georgia", "atlanta"], taxBps: 400 },
  { code: "HI", label: "Hawaii", capital: "Honolulu", matchTerms: ["hawaii", "honolulu"] },
  { code: "ID", label: "Idaho", capital: "Boise", matchTerms: ["idaho", "boise"] },
  { code: "IL", label: "Illinois", capital: "Springfield", matchTerms: ["illinois", "chicago"], taxBps: 625 },
  { code: "IN", label: "Indiana", capital: "Indianapolis", matchTerms: ["indiana", "indianapolis"] },
  { code: "IA", label: "Iowa", capital: "Des Moines", matchTerms: ["iowa", "des moines"] },
  { code: "KS", label: "Kansas", capital: "Topeka", matchTerms: ["kansas", "topeka", "wichita"] },
  { code: "KY", label: "Kentucky", capital: "Frankfort", matchTerms: ["kentucky", "louisville"] },
  { code: "LA", label: "Louisiana", capital: "Baton Rouge", matchTerms: ["louisiana", "new orleans"] },
  { code: "ME", label: "Maine", capital: "Augusta", matchTerms: ["maine", "portland"] },
  { code: "MD", label: "Maryland", capital: "Annapolis", matchTerms: ["maryland", "baltimore"] },
  { code: "MA", label: "Massachusetts", capital: "Boston", matchTerms: ["massachusetts", "boston"], taxBps: 625 },
  { code: "MI", label: "Michigan", capital: "Lansing", matchTerms: ["michigan", "detroit"] },
  { code: "MN", label: "Minnesota", capital: "Saint Paul", matchTerms: ["minnesota", "minneapolis"] },
  { code: "MS", label: "Mississippi", capital: "Jackson", matchTerms: ["mississippi", "jackson"] },
  { code: "MO", label: "Missouri", capital: "Jefferson City", matchTerms: ["missouri", "st. louis", "kansas city"] },
  { code: "MT", label: "Montana", capital: "Helena", matchTerms: ["montana", "helena"] },
  { code: "NE", label: "Nebraska", capital: "Lincoln", matchTerms: ["nebraska", "omaha"] },
  { code: "NV", label: "Nevada", capital: "Carson City", matchTerms: ["nevada", "las vegas"], taxBps: 685 },
  { code: "NH", label: "New Hampshire", capital: "Concord", matchTerms: ["new hampshire", "concord"] },
  { code: "NJ", label: "New Jersey", capital: "Trenton", matchTerms: ["new jersey", "newark"], taxBps: 663 },
  { code: "NM", label: "New Mexico", capital: "Santa Fe", matchTerms: ["new mexico", "albuquerque"] },
  { code: "NY", label: "New York", capital: "Albany", matchTerms: ["new york", "nyc", "manhattan"], taxBps: 400 },
  { code: "NC", label: "North Carolina", capital: "Raleigh", matchTerms: ["north carolina", "charlotte"], taxBps: 475 },
  { code: "ND", label: "North Dakota", capital: "Bismarck", matchTerms: ["north dakota", "bismarck"] },
  { code: "OH", label: "Ohio", capital: "Columbus", matchTerms: ["ohio", "columbus", "cleveland"] },
  { code: "OK", label: "Oklahoma", capital: "Oklahoma City", matchTerms: ["oklahoma", "oklahoma city", "tulsa"] },
  { code: "OR", label: "Oregon", capital: "Salem", matchTerms: ["oregon", "portland"], taxBps: 0 },
  { code: "PA", label: "Pennsylvania", capital: "Harrisburg", matchTerms: ["pennsylvania", "philadelphia"], taxBps: 600 },
  { code: "RI", label: "Rhode Island", capital: "Providence", matchTerms: ["rhode island", "providence"] },
  { code: "SC", label: "South Carolina", capital: "Columbia", matchTerms: ["south carolina", "charleston"] },
  { code: "SD", label: "South Dakota", capital: "Pierre", matchTerms: ["south dakota", "pierre"] },
  { code: "TN", label: "Tennessee", capital: "Nashville", matchTerms: ["tennessee", "nashville", "memphis"] },
  { code: "TX", label: "Texas", capital: "Austin", matchTerms: ["texas", "houston", "dallas", "austin"], taxBps: 625 },
  { code: "UT", label: "Utah", capital: "Salt Lake City", matchTerms: ["utah", "salt lake city"] },
  { code: "VT", label: "Vermont", capital: "Montpelier", matchTerms: ["vermont", "montpelier"] },
  { code: "VA", label: "Virginia", capital: "Richmond", matchTerms: ["virginia", "richmond"], taxBps: 530 },
  { code: "WA", label: "Washington", capital: "Olympia", matchTerms: ["washington", "seattle"], taxBps: 650 },
  { code: "WV", label: "West Virginia", capital: "Charleston", matchTerms: ["west virginia", "charleston"] },
  { code: "WI", label: "Wisconsin", capital: "Madison", matchTerms: ["wisconsin", "milwaukee"] },
  { code: "WY", label: "Wyoming", capital: "Cheyenne", matchTerms: ["wyoming", "cheyenne"] },
];

export const US_BASE_SUBDIVISION_OVERLAYS: Record<string, GhanaSubdivisionOverlay> = Object.fromEntries(
  US_STATE_CATALOG.map((state) => [state.code, overlay(state)])
);

export const US_STATE_ALIASES: Record<string, string> = US_STATE_CATALOG.reduce(
  (aliases, state) => {
    aliases[state.label.toUpperCase()] = state.code;
    aliases[state.capital.toUpperCase()] = state.code;
    for (const term of state.matchTerms) {
      aliases[term.toUpperCase()] = state.code;
    }
    return aliases;
  },
  {} as Record<string, string>
);
