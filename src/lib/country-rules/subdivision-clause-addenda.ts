import type { CountryCode } from "./types";
import { getAutoAddendum } from "./subdivision-addenda-auto";

export type SubdivisionClauseAddendum = {
  jurisdictionId: CountryCode;
  subdivisionCode: string;
  label: string;
  title: string;
  clauses: string[];
  disclosures: string[];
  registrations?: string[];
};

/** Sub-national clause addenda merged into generated lease schedules. */
export const SUBDIVISION_CLAUSE_ADDENDA: SubdivisionClauseAddendum[] = [
  {
    jurisdictionId: "GH",
    subdivisionCode: "AA",
    label: "Greater Accra",
    title: "Greater Accra — Rent Control & Stamp Duty",
    clauses: [
      "Rent Control Department registration where property falls within rent-controlled zone.",
      "Stamp duty on lease instrument per GRA practice — typically borne by tenant unless agreed otherwise.",
      "Advance rent shall not exceed six (6) months per Act 220.",
    ],
    disclosures: ["GhanaPostGPS address mandatory on schedule.", "PayAngels rent collection with GRA withholding disclosure."],
    registrations: ["Rent Control Office (Accra)", "GRA stamp duty"],
  },
  {
    jurisdictionId: "GH",
    subdivisionCode: "AS",
    label: "Ashanti",
    title: "Ashanti Region — Customary & Statutory Overlay",
    clauses: [
      "Stool land consent disclosure where customary ownership applies.",
      "Advance rent cap of six (6) months under national Act 220.",
    ],
    disclosures: ["Kumasi Metropolitan Assembly property rate may apply separately."],
  },
  {
    jurisdictionId: "NG",
    subdivisionCode: "LA",
    label: "Lagos State",
    title: "Lagos State Tenancy Addendum",
    clauses: [
      "Advance rent not to exceed six (6) months (Lagos enforcement practice).",
      "Written tenancy agreement registration with Lagos State tenancy registry where required.",
      "Landlord shall not seize tenant goods without court order.",
    ],
    disclosures: ["Lagos rent tribunal available for dispute resolution."],
    registrations: ["Lagos State tenancy registration (where applicable)"],
  },
  {
    jurisdictionId: "NG",
    subdivisionCode: "FC",
    label: "FCT Abuja",
    title: "FCT Abuja — Federal Capital Territory",
    clauses: [
      "Governor's consent disclosure for federal land leases.",
      "Security deposit return within agreed timeline with itemized deductions.",
    ],
    disclosures: ["Area Courts handle FCT tenancy disputes."],
  },
  {
    jurisdictionId: "KE",
    subdivisionCode: "NBI",
    label: "Nairobi County",
    title: "Nairobi County Lease Addendum",
    clauses: [
      "Advance rent shall not exceed six (6) months.",
      "Deposit refund within thirty (30) days of lawful vacation with written itemization.",
      "Commercial premises: Landlord and Tenant (Shops) Act notice requirements apply.",
    ],
    disclosures: ["Nairobi City County property rates billed separately from rent."],
  },
  {
    jurisdictionId: "KE",
    subdivisionCode: "MSA",
    label: "Mombasa County",
    title: "Coastal / Tourism Overlay",
    clauses: [
      "Coastal strip land consent where applicable.",
      "Tourism levy disclosure for short-stay furnished lettings.",
    ],
    disclosures: ["County tourism bed levy may apply to nightly bookings."],
  },
  {
    jurisdictionId: "ZA",
    subdivisionCode: "GT",
    label: "Gauteng",
    title: "Gauteng — Rental Housing Act",
    clauses: [
      "Deposit held in interest-bearing account where Rental Housing Act requires.",
      "Rental Housing Tribunal jurisdiction for Gauteng disputes.",
      "Twenty (20) business days deposit refund timeline after move-out inspection.",
    ],
    disclosures: ["City of Johannesburg / Ekurhuleni municipal rates separate from rent."],
  },
  {
    jurisdictionId: "ZA",
    subdivisionCode: "WC",
    label: "Western Cape",
    title: "Western Cape Provincial Overlay",
    clauses: [
      "Lease must reference Western Cape rental housing consumer protection norms.",
      "Water restrictions and drought bylaws compliance clause for landlord-supplied water.",
    ],
    disclosures: ["City of Cape Town rates and refuse charges may be recovered per agreement."],
  },
  {
    jurisdictionId: "GB",
    subdivisionCode: "ENG",
    label: "England",
    title: "Assured Shorthold Tenancy (England) Pack",
    clauses: [
      "How to Rent guide provided to tenant at commencement (England).",
      "Tenancy deposit protected in government-approved scheme within thirty (30) days.",
      "Tenant Fees Act 2019 — prohibited payments schedule attached.",
      "Section 21 / Section 8 notice procedures per Housing Act 1988 as amended.",
    ],
    disclosures: ["Right to Rent checks completed and recorded.", "EPC rating disclosed on schedule."],
    registrations: ["Deposit protection scheme (DPS / TDS / MyDeposits)"],
  },
  {
    jurisdictionId: "GB",
    subdivisionCode: "SCT",
    label: "Scotland",
    title: "Private Residential Tenancy (Scotland)",
    clauses: [
      "Private Residential Tenancy — no fixed-term eviction without statutory ground.",
      "Deposit submitted to approved Scottish scheme.",
    ],
    disclosures: ["Repairing Standard under Housing (Scotland) Act applies."],
  },
  {
    jurisdictionId: "GB",
    subdivisionCode: "WLS",
    label: "Wales",
    title: "Rent Smart Wales",
    clauses: [
      "Landlord registered with Rent Smart Wales and licence number stated.",
      "Occupation contract terms compliant with Renting Homes (Wales) Act 2016.",
    ],
    disclosures: ["Fitness for human habitation (Wales) obligations apply."],
    registrations: ["Rent Smart Wales registration"],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "CA",
    label: "California",
    title: "California Civil Code Addendum",
    clauses: [
      "AB 1482 rent cap: annual increase limited to 5% + local CPI where applicable.",
      "Just-cause eviction required after twelve (12) months occupancy in covered units.",
      "Security deposit not to exceed two (2) months (unfurnished) or three (3) months (furnished).",
      "Mold, bed bug, and lead disclosure addenda attached where required.",
    ],
    disclosures: ["Tenant right to request inspection before deposit deductions."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "NY",
    label: "New York",
    title: "Housing Stability & Tenant Protection Act",
    clauses: [
      "Security deposit capped at one (1) month rent.",
      "Good-cause eviction protections where local law applies (NYC / state overlay).",
      "Deposit held in separate interest-bearing account with annual statement.",
    ],
    disclosures: ["Window guard and lead paint disclosures for pre-1978 buildings."],
  },
  {
    jurisdictionId: "AE",
    subdivisionCode: "DXB",
    label: "Dubai",
    title: "Ejari Registration Pack",
    clauses: [
      "Lease registered on Ejari system within thirty (30) days of commencement.",
      "Security deposit capped per Dubai Rental Decree practice.",
      "Maintenance responsibilities per Dubai Land Department standard contract annex.",
    ],
    disclosures: ["DEWA / district cooling account transfer on move-in.", "Tourism Dirham fee for holiday lettings."],
    registrations: ["Ejari registration", "Dubai Land Department"],
  },
  {
    jurisdictionId: "AE",
    subdivisionCode: "AUH",
    label: "Abu Dhabi",
    title: "Tawtheeq Registration",
    clauses: [
      "Tenancy contract attested via Tawtheeq / ADGM portal as applicable.",
      "Rent increases subject to Abu Dhabi Executive Council caps where applicable.",
    ],
    disclosures: ["ADDC utility connection transfer required."],
    registrations: ["Tawtheeq / ADGM registration"],
  },
  {
    jurisdictionId: "CA",
    subdivisionCode: "ON",
    label: "Ontario",
    title: "Residential Tenancies Act (Ontario)",
    clauses: [
      "Standard Form of Lease (Ontario) incorporated by reference.",
      "Last month's rent deposit only — no separate security deposit.",
      "Rent increase guideline compliance with ninety (90) days written notice.",
    ],
    disclosures: ["Landlord and Tenant Board jurisdiction for disputes."],
  },
  {
    jurisdictionId: "CA",
    subdivisionCode: "BC",
    label: "British Columbia",
    title: "Residential Tenancy Act (BC)",
    clauses: [
      "Half-month security deposit maximum.",
      "Move-in / move-out condition inspection report mandatory.",
    ],
    disclosures: ["RTB dispute resolution available."],
  },
  {
    jurisdictionId: "AU",
    subdivisionCode: "NSW",
    label: "New South Wales",
    title: "NSW Residential Tenancies",
    clauses: [
      "Bond lodged with NSW Rental Bond Board within required timeframe.",
      "Condition report completed at start and end of tenancy.",
    ],
    disclosures: ["Fair Trading NSW handles bond disputes."],
    registrations: ["NSW Rental Bond Board"],
  },
  {
    jurisdictionId: "AU",
    subdivisionCode: "VIC",
    label: "Victoria",
    title: "Residential Tenancies Act (Vic)",
    clauses: [
      "Bond lodged with RTBA Victoria.",
      "Minimum standards for rental properties (2021 reforms) compliance clause.",
    ],
    disclosures: ["Consumer Affairs Victoria rental minimum standards apply."],
  },
  {
    jurisdictionId: "EU",
    subdivisionCode: "DE",
    label: "Germany",
    title: "BGB Mietrecht Addendum",
    clauses: [
      "Kaution (deposit) capped at three (3) months Kaltmiete in three installments.",
      "Betriebskosten (service charge) settlement clause with annual statement.",
      "Mieterschutz — notice periods per BGB §573.",
    ],
    disclosures: ["Heating cost ordinance (HeizkostenV) allocation rules attached."],
  },
  {
    jurisdictionId: "EU",
    subdivisionCode: "FR",
    label: "France",
    title: "Loi Alur / Habitation Addendum",
    clauses: [
      "Dépôt de garantie capped at one (1) month unfurnished / two (2) months furnished.",
      "Diagnostic techniques (DPE, amiante, plomb, etc.) annexed to lease.",
      "Encadrement des loyers compliance in zones tendues where applicable.",
    ],
    disclosures: ["Assurance habitation proof required from tenant."],
  },
  {
    jurisdictionId: "IN",
    subdivisionCode: "MH",
    label: "Maharashtra",
    title: "Model Tenancy Act / Maharashtra Overlay",
    clauses: [
      "Leave and licence vs lease classification stated explicitly.",
      "Stamp duty and registration within four (4) months where mandatory.",
      "Security deposit not to exceed two (2) months rent (Model Tenancy Act guidance).",
    ],
    disclosures: ["TDS on rent deduction disclosure for landlord obligations."],
    registrations: ["Sub-registrar office (if registration mandatory)"],
  },
  {
    jurisdictionId: "IN",
    subdivisionCode: "DL",
    label: "Delhi",
    title: "Delhi Rent Control / Registration",
    clauses: [
      "Delhi tenancy registration on rent authority portal where applicable.",
      "Advance rent and deposit caps per Delhi tenancy rules.",
    ],
    disclosures: ["MCD property tax recovery clause if agreed."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "TX",
    label: "Texas",
    title: "Texas Property Code Addendum",
    clauses: [
      "Security deposit return within thirty (30) days with itemized deductions.",
      "Landlord must provide tenant with name and address of deposit holder.",
      "Lockout and utility shutoff prohibited as self-help remedies.",
    ],
    disclosures: ["Texas Property Code Chapter 92 applies to residential tenancies."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "FL",
    label: "Florida",
    title: "Florida Residential Landlord-Tenant Act",
    clauses: [
      "Security deposit notice and claim procedures per §83.49.",
      "Radon gas disclosure for dwellings on second floor or below.",
      "Landlord access with twelve (12) hours notice except emergency.",
    ],
    disclosures: ["Lead-based paint disclosure for pre-1978 housing."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "WA",
    label: "Washington",
    title: "Washington State Landlord-Tenant Act",
    clauses: [
      "Deposit not to exceed one (1) month rent without pet addendum.",
      "Twenty-one (21) day deposit return after move-out.",
      "Just-cause eviction after initial term in Seattle / state overlay where applicable.",
    ],
    disclosures: ["City of Seattle RRIO registration where required."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "IL",
    label: "Illinois",
    title: "Chicago RLTO / Illinois Overlay",
    clauses: [
      "Chicago RLTO applies within city limits — security deposit interest and return timelines.",
      "Lead paint disclosure for pre-1978 buildings.",
      "Security deposit not to exceed one (1) month (Chicago) or two (2) months (state default).",
    ],
    disclosures: ["Cook County Just Housing amendment may apply."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "NJ",
    label: "New Jersey",
    title: "New Jersey Anti-Eviction Act",
    clauses: [
      "Security deposit held in interest-bearing account with annual statement.",
      "Thirty (30) day deposit return after lease termination.",
      "Cause required for eviction after initial lease term.",
    ],
    disclosures: ["Window guard and lead paint certificates where applicable."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "MA",
    label: "Massachusetts",
    title: "Massachusetts Consumer Protection (931 CMR)",
    clauses: [
      "Last month rent deposit with annual 5% interest payment.",
      "Security deposit capped at one (1) month rent.",
      "Condition statement at move-in and move-out mandatory.",
    ],
    disclosures: ["Lead law compliance certificate required."],
  },
  {
    jurisdictionId: "US",
    subdivisionCode: "OR",
    label: "Oregon",
    title: "Oregon Residential Landlord-Tenant Act",
    clauses: [
      "No-cause termination restricted after first year in Portland overlay.",
      "Security deposit return within thirty-one (31) days.",
      "Rent increase notice per SB 608 where applicable.",
    ],
    disclosures: ["Carbon monoxide and smoke alarm compliance."],
  },
  {
    jurisdictionId: "NG",
    subdivisionCode: "RI",
    label: "Rivers State",
    title: "Rivers State Tenancy Addendum",
    clauses: [
      "Written tenancy agreement recommended for all residential lettings.",
      "Advance rent not to exceed six (6) months where state practice applies.",
      "Landlord shall not forcefully evict without court order.",
    ],
    disclosures: ["Rivers State tenancy dispute resolution available."],
  },
  {
    jurisdictionId: "NG",
    subdivisionCode: "OG",
    label: "Ogun State",
    title: "Ogun State Tenancy Overlay",
    clauses: [
      "Tenancy agreement registration with Ogun State ministry where required.",
      "Security deposit return with itemized deductions on lawful vacation.",
    ],
    disclosures: ["Property tax and tenement rate billed separately unless agreed."],
  },
  {
    jurisdictionId: "NG",
    subdivisionCode: "KN",
    label: "Kano State",
    title: "Kano State Sharia-Compliant Tenancy",
    clauses: [
      "Tenancy terms shall not conflict with applicable Sharia principles on rent and deposit.",
      "Written agreement in English and Hausa where parties request bilingual schedule.",
    ],
    disclosures: ["Kano State rent tribunal jurisdiction for disputes."],
  },
  {
    jurisdictionId: "CA",
    subdivisionCode: "QC",
    label: "Quebec",
    title: "Civil Code of Quebec — Lease",
    clauses: [
      "Lease governed by Civil Code of Quebec Book III Title VIII.",
      "Mandatory lease form (TAL) for residential leases.",
      "Rent increase restrictions and lease assignment rules per Régie du logement/TAL.",
    ],
    disclosures: ["French language rights apply to lease documentation."],
    registrations: ["Tribunal administratif du logement (TAL)"],
  },
  {
    jurisdictionId: "CA",
    subdivisionCode: "AB",
    label: "Alberta",
    title: "Residential Tenancies Act (Alberta)",
    clauses: [
      "Security deposit capped at one (1) month rent.",
      "Ten-day deposit return after possession and inspection.",
      "RTDRS dispute resolution available.",
    ],
    disclosures: ["Alberta RTDRS filing fees may apply to disputes."],
  },
  {
    jurisdictionId: "AU",
    subdivisionCode: "QLD",
    label: "Queensland",
    title: "Residential Tenancies and Rooming Accommodation Act (Qld)",
    clauses: [
      "Bond lodged with RTA Queensland within required timeframe.",
      "Entry condition report mandatory at start of tenancy.",
      "Minimum housing standards compliance from 2023 reforms.",
    ],
    disclosures: ["RTA dispute resolution for bond claims."],
    registrations: ["Residential Tenancies Authority (RTA Qld)"],
  },
  {
    jurisdictionId: "AE",
    subdivisionCode: "SHJ",
    label: "Sharjah",
    title: "Sharjah Municipality Tenancy",
    clauses: [
      "Tenancy contract attestation via Sharjah Municipality portal.",
      "Rent increases subject to Sharjah executive regulations.",
    ],
    disclosures: ["SEWA utility transfer on move-in."],
    registrations: ["Sharjah Municipality attestation"],
  },
  {
    jurisdictionId: "EU",
    subdivisionCode: "IE",
    label: "Ireland",
    title: "Residential Tenancies Board (Ireland)",
    clauses: [
      "Tenancy registered with RTB within one month of commencement.",
      "Deposit not to exceed one (1) month rent.",
      "Part 4 security of tenure after six (6) months occupancy.",
    ],
    disclosures: ["Rent Pressure Zone caps may apply in designated areas."],
    registrations: ["Residential Tenancies Board (RTB)"],
  },
  {
    jurisdictionId: "EU",
    subdivisionCode: "NL",
    label: "Netherlands",
    title: "Dutch Rental Law (Huurwet)",
    clauses: [
      "Liberalised vs social sector rent classification stated.",
      "Service costs settlement with annual specification.",
      "Deposit capped at two (2) months basic rent.",
    ],
    disclosures: ["Huurcommissie rent assessment available in social sector."],
  },
  {
    jurisdictionId: "EU",
    subdivisionCode: "ES",
    label: "Spain",
    title: "Ley de Arrendamientos Urbanos (LAU)",
    clauses: [
      "Mandatory deposit of one (1) month (residential) or two (2) months (commercial).",
      "Additional guarantee up to two (2) months where agreed.",
      "Annual rent update per IPC index where contract permits.",
    ],
    disclosures: ["Energy certificate (CEE) annexed to lease."],
  },
  {
    jurisdictionId: "EU",
    subdivisionCode: "IT",
    label: "Italy",
    title: "Codice Civile — Locazione",
    clauses: [
      "Contract type stated: libero (4+4) or concordato where applicable.",
      "Registration with Agenzia delle Entrate within thirty (30) days.",
      "Deposit not to exceed three (3) months rent.",
    ],
    disclosures: ["IMU / local tax allocation per agreement."],
    registrations: ["Agenzia delle Entrate registration"],
  },
  {
    jurisdictionId: "IN",
    subdivisionCode: "KA",
    label: "Karnataka",
    title: "Karnataka Rent Control / Model Tenancy",
    clauses: [
      "Leave and licence vs lease classification explicit.",
      "Stamp duty per Karnataka Stamp Act schedule.",
      "Deposit not to exceed two (2) months under Model Tenancy guidance.",
    ],
    disclosures: ["Bangalore municipal property tax separate from rent."],
  },
  {
    jurisdictionId: "IN",
    subdivisionCode: "TN",
    label: "Tamil Nadu",
    title: "Tamil Nadu Tenancy Overlay",
    clauses: [
      "Registration mandatory for leases exceeding eleven (11) months.",
      "Advance rent cap per local practice and Model Tenancy Act guidance.",
    ],
    disclosures: ["Chennai Corporation property tax recovery if agreed."],
  },
  {
    jurisdictionId: "GH",
    subdivisionCode: "WE",
    label: "Western Region",
    title: "Western Region — Coastal & Mining Overlay",
    clauses: [
      "Advance rent cap six (6) months under Act 220.",
      "Coastal wetland and mining concession disclosure where applicable.",
    ],
    disclosures: ["Sekondi-Takoradi municipal rates billed separately."],
  },
  {
    jurisdictionId: "GH",
    subdivisionCode: "CP",
    label: "Central Region",
    title: "Central Region — Customary Land Overlay",
    clauses: [
      "Stool / family land consent disclosure where customary title applies.",
      "Advance rent not to exceed six (6) months.",
    ],
    disclosures: ["Cape Coast municipal assembly rates may apply."],
  },
  {
    jurisdictionId: "KE",
    subdivisionCode: "KIS",
    label: "Kisumu County",
    title: "Kisumu County Lease Addendum",
    clauses: [
      "Advance rent cap six (6) months.",
      "Lake Victoria riparian and environmental compliance for waterfront properties.",
    ],
    disclosures: ["Kisumu County property rates separate from rent."],
  },
  {
    jurisdictionId: "ZA",
    subdivisionCode: "KZN",
    label: "KwaZulu-Natal",
    title: "KZN Rental Housing Act",
    clauses: [
      "Deposit in interest-bearing account per Rental Housing Act.",
      "KZN Rental Housing Tribunal jurisdiction.",
      "Twenty (20) business days deposit refund after inspection.",
    ],
    disclosures: ["eThekwini / Durban rates recovery if agreed."],
  },
  {
    jurisdictionId: "GB",
    subdivisionCode: "NIR",
    label: "Northern Ireland",
    title: "Northern Ireland Tenancy",
    clauses: [
      "Tenancy deposit protected in approved NI scheme.",
      "Tenancy agreement compliant with Private Tenancies Act (NI) 2022.",
    ],
    disclosures: ["Rent increase notice per NI statutory periods."],
    registrations: ["NI deposit protection scheme"],
  },
];

const addendumIndex = new Map<string, SubdivisionClauseAddendum>(
  SUBDIVISION_CLAUSE_ADDENDA.map((entry) => [`${entry.jurisdictionId}:${entry.subdivisionCode}`, entry])
);

export function getSubdivisionClauseAddendum(
  jurisdictionId: CountryCode,
  subdivisionCode?: string | null
): SubdivisionClauseAddendum | null {
  if (!subdivisionCode) return null;
  const key = `${jurisdictionId}:${subdivisionCode.toUpperCase()}`;
  return addendumIndex.get(key) || getAutoAddendum(jurisdictionId, subdivisionCode);
}

export function listAddendaForJurisdiction(jurisdictionId: CountryCode): SubdivisionClauseAddendum[] {
  return SUBDIVISION_CLAUSE_ADDENDA.filter((entry) => entry.jurisdictionId === jurisdictionId);
}

export function countCuratedAddenda(): number {
  return SUBDIVISION_CLAUSE_ADDENDA.length;
}
