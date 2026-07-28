export type JurisdictionId =
  | "GH"
  | "NG"
  | "KE"
  | "ZA"
  | "US"
  | "GB"
  | "EU"
  | "AE"
  | "CA"
  | "AU"
  | "IN"
  | "GLOBAL";

export type ListingType = "rental" | "sale" | "lease" | "short_stay";

export interface JurisdictionRules {
  id: JurisdictionId;
  label: string;
  countryCodes: string[];
  dataProtectionLaw: string;
  realEstateRegulator: string;
  amlKycRequired: boolean;
  agencyLicenseRequired: boolean;
  fairHousingApplies: boolean;
  coolingOffDays?: number;
  governingLaw: string;
  listingDisclosures: string[];
  rentalRules: string[];
  saleRules: string[];
  shortStayRules: string[];
  paymentRules: string[];
  consumerRights: string[];
}

const JURISDICTIONS: Record<JurisdictionId, JurisdictionRules> = {
  GH: {
    id: "GH",
    label: "Ghana",
    countryCodes: ["GH", "GHA", "GHANA"],
    dataProtectionLaw: "Ghana Data Protection Act, 2012 (Act 843)",
    realEstateRegulator: "Lands Commission · EPA · GRA",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Laws of the Republic of Ghana",
    listingDisclosures: [
      "Confirm land title or lawful authority to market the property.",
      "Disclose encumbrances, litigation, or pending acquisition notices.",
      "State whether price includes agency commission and applicable taxes.",
      "Provide GhanaPostGPS or verifiable address for the listing.",
    ],
    rentalRules: [
      "Rent Control Act may apply to specified premises in Greater Accra and Tema.",
      "Security deposits and advance rent terms must be stated clearly.",
      "Tenant repair obligations and notice periods should be documented in the lease.",
    ],
    saleRules: [
      "Buyer due diligence on land title at Lands Commission is recommended before payment.",
      "Stamp duty and transfer fees apply per Ghana Revenue Authority guidance.",
      "Building permit and occupancy status should be disclosed for improvements.",
    ],
    shortStayRules: [
      "Short-stay operators should comply with local hospitality and tax registration where required.",
      "House rules, check-in/out times, and cancellation policy must be visible before booking.",
    ],
    paymentRules: [
      "Payments processed via licensed PSP (Paystack). BaytMiftah is not a bank or escrow agent unless stated.",
      "Mobile money and card receipts must be retained for dispute resolution.",
      "Large transfers may trigger AML reporting obligations for regulated entities.",
    ],
    consumerRights: [
      "Right to accurate listing information and good-faith negotiation.",
      "Right to request identity verification of the marketing agency.",
      "Right to lodge complaints with the Data Protection Commission for privacy issues.",
    ],
  },
  NG: {
    id: "NG",
    label: "Nigeria",
    countryCodes: ["NG", "NGA", "NIGERIA"],
    dataProtectionLaw: "Nigeria Data Protection Act, 2023 (NDPA)",
    realEstateRegulator: "State land registries · EFCC AML · Lagos tenancy laws",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Laws of the Federal Republic of Nigeria",
    listingDisclosures: [
      "Certificate of occupancy or lawful title documentation where applicable.",
      "Disclose service charge, agency fee, and VAT components.",
      "State whether property is subject to governor's consent requirements.",
    ],
    rentalRules: [
      "Lagos Tenancy Law limits advance rent for certain tenant classes.",
      "Lease terms and notice periods must comply with state tenancy regulations.",
    ],
    saleRules: [
      "Governor's consent and deed registration requirements vary by state.",
      "Conduct independent legal search before completion payments.",
    ],
    shortStayRules: ["Display cancellation policy and applicable state hospitality taxes."],
    paymentRules: [
      "Use licensed payment processors. PEP and AML screening may apply for high-value deals.",
      "Naira transactions must comply with CBN FX rules for cross-border payments.",
    ],
    consumerRights: [
      "NDPA rights: access, rectification, erasure, and objection to processing.",
      "Right to fair marketing under FCCPC consumer protection principles.",
    ],
  },
  KE: {
    id: "KE",
    label: "Kenya",
    countryCodes: ["KE", "KEN", "KENYA"],
    dataProtectionLaw: "Data Protection Act, 2019",
    realEstateRegulator: "Land Control Boards · EARB · ODPC",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Laws of the Republic of Kenya",
    listingDisclosures: [
      "Land reference number and county where available.",
      "Disclose caveats, charges, or community land considerations.",
    ],
    rentalRules: [
      "Rent restriction laws may cap increases for certain residential premises.",
      "Deposit and notice terms must be stated in the tenancy agreement.",
    ],
    saleRules: ["Land Control Board consent may be required for certain transfers."],
    shortStayRules: ["Tourism regulatory permits may apply for commercial short stays."],
    paymentRules: ["M-Pesa and card payments via licensed PSP. AML rules apply to agents."],
    consumerRights: ["ODPC data subject rights and consumer protection under Competition Act."],
  },
  ZA: {
    id: "ZA",
    label: "South Africa",
    countryCodes: ["ZA", "ZAF", "SOUTH AFRICA"],
    dataProtectionLaw: "Protection of Personal Information Act (POPIA)",
    realEstateRegulator: "EAAB · FIC (FICA AML) · Rental Housing Act",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Laws of the Republic of South Africa",
    listingDisclosures: [
      "FICA identification may be required before mandate or offer acceptance.",
      "Disclose sectional title levies, rates, and body corporate rules.",
    ],
    rentalRules: [
      "Rental Housing Act governs deposits, inspections, and unfair practices.",
      "Lease must specify escalation, maintenance, and cancellation terms.",
    ],
    saleRules: [
      "OTP should include voetstoots disclosures and compliance certificates where required.",
      "Transfer duty and conveyancing timelines must be clear.",
    ],
    shortStayRules: ["Municipal zoning and short-term rental bylaws may apply."],
    paymentRules: ["FICA reporting for cash transactions above prescribed thresholds."],
    consumerRights: ["POPIA rights and Consumer Protection Act remedies."],
  },
  US: {
    id: "US",
    label: "United States",
    countryCodes: ["US", "USA", "UNITED STATES"],
    dataProtectionLaw: "State privacy laws (CCPA/CPRA, etc.) · federal GLBA where applicable",
    realEstateRegulator: "State real estate commissions · HUD Fair Housing · CFPB",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    coolingOffDays: 3,
    governingLaw: "Laws of the listing state and applicable federal law",
    listingDisclosures: [
      "Lead-based paint disclosure for pre-1978 housing (federal).",
      "State-mandated seller property disclosures and agency relationships.",
      "HOA/condo docs and special assessments where applicable.",
    ],
    rentalRules: [
      "Fair Housing Act applies — no discriminatory advertising or screening.",
      "Security deposit rules and habitability standards vary by state.",
    ],
    saleRules: [
      "RESPA governs settlement disclosures for financed purchases.",
      "State transfer disclosures and natural hazard zones may be required.",
    ],
    shortStayRules: ["Local STR registration, occupancy tax, and zoning rules apply."],
    paymentRules: [
      "Earnest money and escrow handling must follow state broker regulations.",
      "AML/BSA reporting for certain cash transactions.",
    ],
    consumerRights: [
      "Fair Housing complaint rights via HUD.",
      "State attorney general and CFPB mortgage servicing protections.",
    ],
  },
  GB: {
    id: "GB",
    label: "United Kingdom",
    countryCodes: ["GB", "UK", "UNITED KINGDOM", "ENGLAND", "SCOTLAND", "WALES"],
    dataProtectionLaw: "UK GDPR · Data Protection Act 2018",
    realEstateRegulator: "HMRC AML · Trading Standards · redress schemes",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Laws of England and Wales (unless otherwise stated)",
    listingDisclosures: [
      "EPC rating required for most marketed residential properties.",
      "Material information scheme (NTSELAT) — price, tenure, council tax band.",
      "Lease length and ground rent for leasehold properties.",
    ],
    rentalRules: [
      "How to Rent guide must be provided for Assured Shorthold Tenancies.",
      "Tenant Fees Act limits certain charges in England.",
      "Right to Rent checks where applicable.",
    ],
    saleRules: [
      "TA6/TA10 forms and conveyancing searches are standard.",
      "AML customer due diligence required before offer acceptance.",
    ],
    shortStayRules: ["Planning permission and council STR rules may apply."],
    paymentRules: ["Client money protection schemes apply to regulated agents."],
    consumerRights: ["ICO data rights · Property Ombudsman / redress schemes."],
  },
  EU: {
    id: "EU",
    label: "European Union",
    countryCodes: ["EU", "DE", "FR", "ES", "IT", "NL", "BE", "PT", "IE", "AT", "PL"],
    dataProtectionLaw: "GDPR · ePrivacy Directive",
    realEstateRegulator: "National land registries · AMLD6 · energy performance rules",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    coolingOffDays: 14,
    governingLaw: "Applicable member state law",
    listingDisclosures: [
      "Energy Performance Certificate where required.",
      "Surface area, tenure, and charges per local civil codes.",
    ],
    rentalRules: [
      "Mandatory pre-contract information and deposit caps in many states.",
      "Anti-discrimination directives apply to tenant selection.",
    ],
    saleRules: ["Notary or lawyer involvement common; cooling-off may apply for off-plan."],
    shortStayRules: ["City registration and tourist tax rules vary by municipality."],
    paymentRules: ["PSD2 strong customer authentication for card payments."],
    consumerRights: ["GDPR rights · EU consumer directive remedies for distance contracts."],
  },
  AE: {
    id: "AE",
    label: "United Arab Emirates",
    countryCodes: ["AE", "UAE", "DUBAI", "ABU DHABI"],
    dataProtectionLaw: "UAE Federal PDPL",
    realEstateRegulator: "RERA (Dubai) · DLD · Trakheesi permit",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "UAE federal and emirate-level law",
    listingDisclosures: [
      "Valid brokerage registration and Trakheesi permit for Dubai listings.",
      "Service charge, DEWA, and community fees disclosure.",
    ],
    rentalRules: ["Ejari registration required in Dubai for tenancy contracts."],
    saleRules: ["Oqood/off-plan and transfer procedures via trustee offices."],
    shortStayRules: ["Holiday home permits and DTCM registration may apply."],
    paymentRules: ["AML/CFT rules via UAE FIU for high-value transactions."],
    consumerRights: ["PDPL data subject rights · RERA dispute resolution."],
  },
  CA: {
    id: "CA",
    label: "Canada",
    countryCodes: ["CA", "CAN", "CANADA"],
    dataProtectionLaw: "PIPEDA · provincial privacy acts",
    realEstateRegulator: "Provincial real estate councils · FINTRAC AML",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Provincial law of the listing jurisdiction",
    listingDisclosures: [
      "Provincial seller disclosure forms (e.g. SPIS in Ontario).",
      "Condo status certificate where applicable.",
    ],
    rentalRules: ["Provincial tenancy acts govern deposits, rent increases, and eviction."],
    saleRules: ["FINTRAC ID verification for brokers on certain transactions."],
    shortStayRules: ["Municipal STR licensing (e.g. Toronto, Vancouver)."],
    paymentRules: ["FINTRAC reporting for large cash transactions."],
    consumerRights: ["Privacy commissioner complaints · provincial tenancy tribunals."],
  },
  AU: {
    id: "AU",
    label: "Australia",
    countryCodes: ["AU", "AUS", "AUSTRALIA"],
    dataProtectionLaw: "Privacy Act 1988 · APPs",
    realEstateRegulator: "State fair trading · AUSTRAC AML",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "State or territory law of the listing",
    listingDisclosures: [
      "Material facts disclosure required under state property law.",
      "Strata levies and bushfire/flood overlays where relevant.",
    ],
    rentalRules: ["Bond caps and minimum standards under state residential tenancies acts."],
    saleRules: ["Cooling-off periods apply in several states for private sales."],
    shortStayRules: ["State STR registration and body corporate bylaws."],
    paymentRules: ["AUSTRAC AML/CTF for agents and conveyancers."],
    consumerRights: ["OAIC privacy rights · state fair trading remedies."],
  },
  IN: {
    id: "IN",
    label: "India",
    countryCodes: ["IN", "IND", "INDIA"],
    dataProtectionLaw: "DPDP Act, 2023",
    realEstateRegulator: "RERA (state authorities) · FEMA for foreign buyers",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Laws of India and applicable state RERA",
    listingDisclosures: [
      "RERA registration number for applicable projects.",
      "Carpet area, completion status, and encumbrance certificate references.",
    ],
    rentalRules: [
      "Model Tenancy Act principles adopted variably by states.",
      "Stamp duty on lease agreements per state law.",
    ],
    saleRules: ["RERA escrow and disclosure norms for new projects."],
    shortStayRules: ["State tourism and GST registration may apply."],
    paymentRules: ["PMLA reporting for high-value property transactions."],
    consumerRights: ["DPDP rights · RERA authority complaints."],
  },
  GLOBAL: {
    id: "GLOBAL",
    label: "International",
    countryCodes: ["*"],
    dataProtectionLaw: "Applicable local data protection law",
    realEstateRegulator: "Local land registry and licensing authority",
    amlKycRequired: true,
    agencyLicenseRequired: true,
    fairHousingApplies: true,
    governingLaw: "Local law of the property jurisdiction",
    listingDisclosures: [
      "Verify lawful authority to market the property.",
      "Disclose material defects, encumbrances, and fee components.",
    ],
    rentalRules: ["Comply with local tenancy and deposit regulations."],
    saleRules: ["Independent legal and title review recommended before payment."],
    shortStayRules: ["Comply with local hospitality, tax, and zoning rules."],
    paymentRules: ["Use licensed payment processors. Retain transaction records."],
    consumerRights: ["Exercise local consumer and data protection rights."],
  },
};

const REGION_TO_JURISDICTION: Record<string, JurisdictionId> = {
  ghana: "GH",
  accra: "GH",
  tema: "GH",
  kumasi: "GH",
  nigeria: "NG",
  lagos: "NG",
  abuja: "NG",
  kenya: "KE",
  nairobi: "KE",
  "south africa": "ZA",
  johannesburg: "ZA",
  "cape town": "ZA",
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  england: "GB",
  london: "GB",
  scotland: "GB",
  wales: "GB",
  germany: "EU",
  france: "EU",
  spain: "EU",
  italy: "EU",
  netherlands: "EU",
  uae: "AE",
  dubai: "AE",
  "abu dhabi": "AE",
  canada: "CA",
  toronto: "CA",
  australia: "AU",
  sydney: "AU",
  india: "IN",
  mumbai: "IN",
};

export function normalizeCountryCode(value?: string | null) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "");
}

export function resolveJurisdiction(input?: {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}): JurisdictionId {
  const country = normalizeCountryCode(input?.country);
  if (country) {
    for (const rules of Object.values(JURISDICTIONS)) {
      if (rules.id === "GLOBAL") continue;
      if (rules.countryCodes.some((code) => code === country)) {
        return rules.id;
      }
    }
  }

  const locationKey = [input?.region, input?.city, input?.country]
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  for (const [needle, jurisdiction] of Object.entries(REGION_TO_JURISDICTION)) {
    if (locationKey.includes(needle)) return jurisdiction;
  }

  return "GH";
}

export function getJurisdictionRules(id: JurisdictionId = "GH") {
  return JURISDICTIONS[id] || JURISDICTIONS.GLOBAL;
}

export function listSupportedJurisdictions() {
  return Object.values(JURISDICTIONS).filter((item) => item.id !== "GLOBAL");
}

export function getListingComplianceChecklist(
  jurisdictionId: JurisdictionId,
  listingType: ListingType
) {
  const rules = getJurisdictionRules(jurisdictionId);
  const typeRules =
    listingType === "rental" || listingType === "lease"
      ? rules.rentalRules
      : listingType === "short_stay"
        ? rules.shortStayRules
        : rules.saleRules;

  return {
    jurisdiction: rules,
    requiredDisclosures: [...rules.listingDisclosures, ...typeRules],
    requiresAgencyLicense: rules.agencyLicenseRequired,
    requiresKyc: rules.amlKycRequired,
    fairHousing: rules.fairHousingApplies,
  };
}

export function getPaymentComplianceDisclosures(jurisdictionId: JurisdictionId) {
  const rules = getJurisdictionRules(jurisdictionId);
  return {
    jurisdiction: rules,
    disclosures: rules.paymentRules,
    consumerRights: rules.consumerRights,
    governingLaw: rules.governingLaw,
    coolingOffDays: rules.coolingOffDays,
  };
}

export function validateListingCompliance(input: {
  jurisdictionId: JurisdictionId;
  listingType: ListingType;
  confirmations: Record<string, boolean>;
}) {
  const checklist = getListingComplianceChecklist(input.jurisdictionId, input.listingType);
  const requiredKeys = [
    "authority_confirmed",
    "disclosures_accurate",
    "agency_licensed",
    "fair_housing",
    ...(checklist.requiresKyc ? ["kyc_ready"] : []),
  ];

  const missing = requiredKeys.filter((key) => !input.confirmations[key]);
  return {
    valid: missing.length === 0,
    missing,
    checklist,
  };
}
