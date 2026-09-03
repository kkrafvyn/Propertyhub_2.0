import type { LeaseRuleSet } from "./country-rules/types";
import type { GhanaSubdivisionOverlay } from "./ghana-regions";

type NgState = {
  code: string;
  label: string;
  capital: string;
  matchTerms: string[];
  leaseRules?: Partial<LeaseRuleSet>;
};

const defaultNgLease: Partial<LeaseRuleSet> = {
  statutoryReferences: ["State tenancy laws vary — confirm applicable state statute"],
  requiredLeaseClauses: ["Written tenancy agreement", "Clear rent and notice terms"],
  minNoticeDaysLandlord: 30,
  maxAdvanceRentMonths: 12,
};

const NG_STATES: NgState[] = [
  { code: "AB", label: "Abia State", capital: "Umuahia", matchTerms: ["abia", "umuahia"] },
  { code: "AD", label: "Adamawa State", capital: "Yola", matchTerms: ["adamawa", "yola"] },
  { code: "AK", label: "Akwa Ibom State", capital: "Uyo", matchTerms: ["akwa ibom", "uyo"] },
  { code: "AN", label: "Anambra State", capital: "Awka", matchTerms: ["anambra", "awka", "onitsha"] },
  { code: "BA", label: "Bauchi State", capital: "Bauchi", matchTerms: ["bauchi"] },
  { code: "BY", label: "Bayelsa State", capital: "Yenagoa", matchTerms: ["bayelsa", "yenagoa"] },
  { code: "BE", label: "Benue State", capital: "Makurdi", matchTerms: ["benue", "makurdi"] },
  { code: "BO", label: "Borno State", capital: "Maiduguri", matchTerms: ["borno", "maiduguri"] },
  { code: "CR", label: "Cross River State", capital: "Calabar", matchTerms: ["cross river", "calabar"] },
  { code: "DE", label: "Delta State", capital: "Asaba", matchTerms: ["delta state", "asaba", "warri"] },
  { code: "EB", label: "Ebonyi State", capital: "Abakaliki", matchTerms: ["ebonyi", "abakaliki"] },
  { code: "ED", label: "Edo State", capital: "Benin City", matchTerms: ["edo", "benin city"] },
  { code: "EK", label: "Ekiti State", capital: "Ado-Ekiti", matchTerms: ["ekiti", "ado-ekiti"] },
  { code: "EN", label: "Enugu State", capital: "Enugu", matchTerms: ["enugu"] },
  { code: "GO", label: "Gombe State", capital: "Gombe", matchTerms: ["gombe"] },
  { code: "IM", label: "Imo State", capital: "Owerri", matchTerms: ["imo", "owerri"] },
  { code: "JI", label: "Jigawa State", capital: "Dutse", matchTerms: ["jigawa", "dutse"] },
  { code: "KD", label: "Kaduna State", capital: "Kaduna", matchTerms: ["kaduna"] },
  {
    code: "KN",
    label: "Kano State",
    capital: "Kano",
    matchTerms: ["kano state", "kano"],
    leaseRules: {
      statutoryReferences: ["Kano State Sharia / customary tenancy overlay where applicable"],
      minNoticeDaysLandlord: 30,
    },
  },
  { code: "KT", label: "Katsina State", capital: "Katsina", matchTerms: ["katsina"] },
  { code: "KE", label: "Kebbi State", capital: "Birnin Kebbi", matchTerms: ["kebbi", "birnin kebbi"] },
  { code: "KO", label: "Kogi State", capital: "Lokoja", matchTerms: ["kogi", "lokoja"] },
  { code: "KW", label: "Kwara State", capital: "Ilorin", matchTerms: ["kwara", "ilorin"] },
  {
    code: "LA",
    label: "Lagos State",
    capital: "Lagos",
    matchTerms: ["lagos state", "lagos", "ikeja"],
    leaseRules: {
      maxAdvanceRentMonths: 6,
      maxSecurityDepositMonths: 1,
      statutoryReferences: ["Lagos State Tenancy Law 2011", "Lagos rent tribunal procedures"],
      requiredLeaseClauses: [
        "Written tenancy agreement registration where required",
        "Advance rent not to exceed 6 months (Lagos enforcement practice)",
      ],
      minNoticeDaysTenant: 7,
      minNoticeDaysLandlord: 30,
    },
  },
  { code: "NA", label: "Nasarawa State", capital: "Lafia", matchTerms: ["nasarawa", "lafia"] },
  { code: "NI", label: "Niger State", capital: "Minna", matchTerms: ["niger state", "minna"] },
  {
    code: "OG",
    label: "Ogun State",
    capital: "Abeokuta",
    matchTerms: ["ogun", "abeokuta"],
    leaseRules: {
      statutoryReferences: ["Ogun State tenancy practice (Lagos corridor)"],
      minNoticeDaysLandlord: 30,
    },
  },
  { code: "ON", label: "Ondo State", capital: "Akure", matchTerms: ["ondo", "akure"] },
  { code: "OS", label: "Osun State", capital: "Osogbo", matchTerms: ["osun", "osogbo"] },
  { code: "OY", label: "Oyo State", capital: "Ibadan", matchTerms: ["oyo", "ibadan"] },
  { code: "PL", label: "Plateau State", capital: "Jos", matchTerms: ["plateau", "jos"] },
  {
    code: "RI",
    label: "Rivers State",
    capital: "Port Harcourt",
    matchTerms: ["rivers state", "port harcourt"],
    leaseRules: {
      statutoryReferences: ["Rivers State tenancy customs", "Port Harcourt rent tribunal"],
      minNoticeDaysLandlord: 30,
    },
  },
  { code: "SO", label: "Sokoto State", capital: "Sokoto", matchTerms: ["sokoto"] },
  { code: "TA", label: "Taraba State", capital: "Jalingo", matchTerms: ["taraba", "jalingo"] },
  { code: "YO", label: "Yobe State", capital: "Damaturu", matchTerms: ["yobe", "damaturu"] },
  { code: "ZA", label: "Zamfara State", capital: "Gusau", matchTerms: ["zamfara", "gusau"] },
  {
    code: "FC",
    label: "FCT (Abuja)",
    capital: "Abuja",
    matchTerms: ["fct", "abuja", "federal capital territory"],
    leaseRules: {
      maxAdvanceRentMonths: 12,
      statutoryReferences: ["Abuja Area Courts tenancy practice", "FCT rent dispute resolution"],
      requiredLeaseClauses: ["Governor's consent disclosure for federal land leases"],
      minNoticeDaysLandlord: 30,
    },
  },
];

export const NIGERIA_STATES = NG_STATES;

export const NIGERIA_SUBDIVISION_OVERLAYS: Record<string, GhanaSubdivisionOverlay> = Object.fromEntries(
  NG_STATES.map((state) => [
    state.code,
    {
      code: state.code,
      label: state.label,
      leaseRules: { ...defaultNgLease, ...state.leaseRules },
    },
  ])
);

export const NIGERIA_STATE_ALIASES: Record<string, string> = NG_STATES.reduce(
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
