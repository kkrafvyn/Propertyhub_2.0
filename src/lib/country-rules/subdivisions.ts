import type { CountryCode, LeaseRuleSet, TaxComponent } from "./types";
import { GHANA_SUBDIVISION_OVERLAYS } from "../ghana-regions";
import { NIGERIA_SUBDIVISION_OVERLAYS } from "../nigeria-states";
import { US_BASE_SUBDIVISION_OVERLAYS } from "../us-states-expansion";

export interface SubdivisionOption {
  code: string;
  label: string;
}

export interface SubdivisionOverlay {
  code: string;
  label: string;
  leaseRules?: Partial<LeaseRuleSet>;
  /** Patches existing tax components by id, or appends if missing. */
  taxProfile?: TaxComponent[];
}

export type SubdivisionRegistry = Partial<Record<CountryCode, Record<string, SubdivisionOverlay>>>;

const us = (code: string, label: string, lease: Partial<LeaseRuleSet>, taxBps?: number): SubdivisionOverlay => ({
  code,
  label,
  leaseRules: lease,
  taxProfile: taxBps != null
    ? [{ id: "state_sales_tax", label: `${label} sales tax (base)`, rateBasisPoints: taxBps, appliesTo: ["service_fee", "short_stay"] }]
    : undefined,
});

export const SUBDIVISION_OVERLAYS: SubdivisionRegistry = {
  US: {
    ...US_BASE_SUBDIVISION_OVERLAYS,
    CA: us("CA", "California", {
      maxSecurityDepositMonths: 2,
      rentControlApplies: true,
      statutoryReferences: ["CA Civil Code §1940 et seq.", "AB 1482 statewide rent cap (5% + CPI)"],
      minNoticeDaysLandlord: 60,
      requiredLeaseClauses: ["Just-cause eviction notice where AB 1482 applies"],
    }, 725),
    NY: us("NY", "New York", {
      maxSecurityDepositMonths: 1,
      rentControlApplies: true,
      statutoryReferences: ["NY Real Property Law", "Housing Stability and Tenant Protection Act 2019"],
      minNoticeDaysLandlord: 30,
      requiredLeaseClauses: ["Security deposit interest or escrow where NYC/local law requires"],
    }, 400),
    TX: us("TX", "Texas", {
      statutoryReferences: ["TX Property Code Chapter 92"],
      minNoticeDaysLandlord: 30,
      requiredLeaseClauses: ["Security deposit itemization within 30 days of move-out"],
    }, 625),
    FL: us("FL", "Florida", {
      statutoryReferences: ["FL Statutes Chapter 83"],
      minNoticeDaysLandlord: 15,
      requiredLeaseClauses: ["Advance notice of deposit claim deductions"],
    }, 600),
    WA: us("WA", "Washington", {
      maxSecurityDepositMonths: 0,
      rentControlApplies: true,
      statutoryReferences: ["RCW 59.18", "Seattle Just Cause Eviction Ordinance"],
      minNoticeDaysLandlord: 20,
    }, 650),
    IL: us("IL", "Illinois", {
      maxSecurityDepositMonths: 0,
      rentControlApplies: true,
      statutoryReferences: ["765 ILCS 705", "Chicago RLTO (if Chicago property)"],
      minNoticeDaysLandlord: 30,
    }, 625),
    MA: us("MA", "Massachusetts", {
      maxSecurityDepositMonths: 1,
      statutoryReferences: ["M.G.L. c. 186", "Security deposit 5% interest rule"],
      minNoticeDaysLandlord: 30,
    }, 625),
    CO: us("CO", "Colorado", {
      maxSecurityDepositMonths: 2,
      statutoryReferences: ["C.R.S. Title 38", "Denver warranty of habitability"],
      minNoticeDaysLandlord: 21,
    }, 290),
    NJ: us("NJ", "New Jersey", {
      maxSecurityDepositMonths: 1.5,
      rentControlApplies: true,
      statutoryReferences: ["NJ Anti-Eviction Act", "Security Deposit Act"],
      minNoticeDaysLandlord: 30,
    }, 663),
    GA: us("GA", "Georgia", {
      maxSecurityDepositMonths: 0,
      statutoryReferences: ["OCGA Title 44 Chapter 7"],
      minNoticeDaysLandlord: 60,
    }, 400),
    AZ: us("AZ", "Arizona", {
      maxSecurityDepositMonths: 1.5,
      statutoryReferences: ["A.R.S. Title 33 Chapter 10"],
      minNoticeDaysLandlord: 30,
    }, 560),
    NV: us("NV", "Nevada", {
      maxSecurityDepositMonths: 3,
      statutoryReferences: ["NRS Chapter 118A"],
      minNoticeDaysLandlord: 30,
    }, 685),
    NC: us("NC", "North Carolina", {
      maxSecurityDepositMonths: 2,
      statutoryReferences: ["NCGS Chapter 42"],
      minNoticeDaysLandlord: 30,
    }, 475),
    VA: us("VA", "Virginia", {
      maxSecurityDepositMonths: 2,
      statutoryReferences: ["VA Code Title 55.1 Chapter 12"],
      minNoticeDaysLandlord: 30,
    }, 530),
    PA: us("PA", "Pennsylvania", {
      maxSecurityDepositMonths: 2,
      rentControlApplies: true,
      statutoryReferences: ["68 P.S. §250.511a", "Philadelphia Fair Housing / rent control (select areas)"],
      minNoticeDaysLandlord: 30,
    }, 600),
    OR: us("OR", "Oregon", {
      maxSecurityDepositMonths: 0,
      rentControlApplies: true,
      statutoryReferences: ["ORS Chapter 90", "Statewide rent increase cap (7% + CPI)"],
      minNoticeDaysLandlord: 30,
    }, 0),
  },
  NG: NIGERIA_SUBDIVISION_OVERLAYS,
  CA: {
    ON: {
      code: "ON",
      label: "Ontario",
      leaseRules: {
        maxSecurityDepositMonths: 0,
        rentControlApplies: true,
        statutoryReferences: ["Residential Tenancies Act 2006 (Ontario)", "Standard Form of Lease mandatory"],
        requiredLeaseClauses: ["Last month's rent deposit only (no security deposit)", "Rent increase guideline compliance"],
        minNoticeDaysLandlord: 60,
      },
      taxProfile: [{ id: "gst", label: "HST (Ontario)", rateBasisPoints: 1300, appliesTo: ["service_fee", "short_stay"], authority: "CRA" }],
    },
    BC: {
      code: "BC",
      label: "British Columbia",
      leaseRules: {
        maxSecurityDepositMonths: 0.5,
        rentControlApplies: true,
        statutoryReferences: ["Residential Tenancy Act (BC)", "RTB dispute resolution"],
        requiredLeaseClauses: ["Half-month damage deposit max", "Annual rent increase cap"],
        minNoticeDaysLandlord: 60,
      },
      taxProfile: [{ id: "gst", label: "GST + PST (BC)", rateBasisPoints: 1200, appliesTo: ["service_fee", "short_stay"], authority: "CRA" }],
    },
    QC: {
      code: "QC",
      label: "Quebec",
      leaseRules: {
        statutoryReferences: ["Civil Code of Québec", "TAL (Tribunal administratif du logement)"],
        requiredLeaseClauses: ["Lease assignment rules", "Repossession notice requirements"],
        minNoticeDaysLandlord: 60,
      },
      taxProfile: [{ id: "gst", label: "GST + QST (Quebec)", rateBasisPoints: 1498, appliesTo: ["service_fee", "short_stay"], authority: "CRA" }],
    },
    AB: {
      code: "AB",
      label: "Alberta",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Residential Tenancies Act (Alberta)", "RTDRS"],
        minNoticeDaysLandlord: 90,
      },
      taxProfile: [{ id: "gst", label: "GST (Alberta)", rateBasisPoints: 500, appliesTo: ["service_fee", "short_stay"], authority: "CRA" }],
    },
    MB: {
      code: "MB",
      label: "Manitoba",
      leaseRules: {
        maxSecurityDepositMonths: 0.5,
        statutoryReferences: ["Residential Tenancies Act (Manitoba)"],
        minNoticeDaysLandlord: 60,
      },
      taxProfile: [{ id: "gst", label: "GST + PST (Manitoba)", rateBasisPoints: 1200, appliesTo: ["service_fee", "short_stay"], authority: "CRA" }],
    },
    SK: {
      code: "SK",
      label: "Saskatchewan",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Residential Tenancies Act (Saskatchewan)"],
        minNoticeDaysLandlord: 60,
      },
      taxProfile: [{ id: "gst", label: "GST + PST (Saskatchewan)", rateBasisPoints: 1100, appliesTo: ["service_fee", "short_stay"], authority: "CRA" }],
    },
  },
  AU: {
    NSW: {
      code: "NSW",
      label: "New South Wales",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Residential Tenancies Act 2010 (NSW)", "NSW Fair Trading bond lodgement"],
        requiredLeaseClauses: ["Bond lodgement with NSW Rental Bond Board", "Condition report at start/end"],
        minNoticeDaysLandlord: 90,
      },
    },
    VIC: {
      code: "VIC",
      label: "Victoria",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        rentControlApplies: true,
        statutoryReferences: ["Residential Tenancies Act 1997 (Vic)", "Residential Rental Provider reforms"],
        requiredLeaseClauses: ["Bond with RTBA Victoria", "Minimum standards checklist"],
        minNoticeDaysLandlord: 60,
      },
    },
    QLD: {
      code: "QLD",
      label: "Queensland",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Residential Tenancies and Rooming Accommodation Act 2008 (Qld)"],
        requiredLeaseClauses: ["Bond with RTA Queensland"],
        minNoticeDaysLandlord: 60,
      },
    },
    WA: {
      code: "WA",
      label: "Western Australia",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Residential Tenancies Act 1987 (WA)"],
        minNoticeDaysLandlord: 60,
      },
    },
    SA: {
      code: "SA",
      label: "South Australia",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Residential Tenancies Act 1995 (SA)", "Consumer and Business Services bond"],
        minNoticeDaysLandlord: 60,
      },
    },
  },
  AE: {
    DXB: {
      code: "DXB",
      label: "Dubai",
      leaseRules: {
        maxSecurityDepositMonths: 0.05,
        statutoryReferences: ["Dubai Law No. 26 of 2007", "RERA Ejari registration mandatory"],
        requiredLeaseClauses: ["Ejari registration within 30 days", "5% security deposit cap (residential)", "90-day non-renewal notice"],
        minNoticeDaysLandlord: 90,
      },
      taxProfile: [{ id: "tourism_levy", label: "Dubai tourism dirham", rateBasisPoints: 0, appliesTo: ["short_stay"], notes: "AED 7–20 per night by property class" }],
    },
    AUH: {
      code: "AUH",
      label: "Abu Dhabi",
      leaseRules: {
        maxSecurityDepositMonths: 0.05,
        statutoryReferences: ["Abu Dhabi tenancy regulations", "Tawtheeq registration"],
        requiredLeaseClauses: ["Tawtheeq / tenancy contract attestation"],
        minNoticeDaysLandlord: 60,
      },
    },
    SHJ: {
      code: "SHJ",
      label: "Sharjah",
      leaseRules: {
        statutoryReferences: ["Sharjah Municipality tenancy rules"],
        requiredLeaseClauses: ["Municipality lease attestation"],
        minNoticeDaysLandlord: 60,
      },
    },
    AJM: {
      code: "AJM",
      label: "Ajman",
      leaseRules: {
        statutoryReferences: ["Ajman tenancy registration"],
        minNoticeDaysLandlord: 60,
      },
    },
  },
  EU: {
    DE: {
      code: "DE",
      label: "Germany",
      leaseRules: {
        maxSecurityDepositMonths: 3,
        rentControlApplies: true,
        statutoryReferences: ["BGB §535 et seq.", "Mietpreisbremse (rent brake) in designated areas"],
        requiredLeaseClauses: ["Heating cost statement (Betriebskosten)", "Energy certificate (Energieausweis)"],
        minNoticeDaysLandlord: 90,
      },
      taxProfile: [{ id: "vat", label: "German VAT", rateBasisPoints: 1900, appliesTo: ["service_fee", "short_stay"], authority: "Bundesfinanzministerium" }],
    },
    FR: {
      code: "FR",
      label: "France",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        rentControlApplies: true,
        statutoryReferences: ["Loi ALUR", "Encadrement des loyers (Paris/Lille/Lyon zones)"],
        requiredLeaseClauses: ["Diagnostic performance énergétique", "État des lieux"],
        minNoticeDaysLandlord: 90,
      },
      taxProfile: [{ id: "vat", label: "French VAT", rateBasisPoints: 2000, appliesTo: ["service_fee", "short_stay"], authority: "DGFiP" }],
    },
    IE: {
      code: "IE",
      label: "Ireland",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Residential Tenancies Act 2004", "RTB registration"],
        requiredLeaseClauses: ["Register tenancy with RTB", "Deposit return within 21 days"],
        minNoticeDaysLandlord: 90,
      },
      taxProfile: [{ id: "vat", label: "Irish VAT", rateBasisPoints: 2300, appliesTo: ["service_fee", "short_stay"], authority: "Revenue" }],
    },
    NL: {
      code: "NL",
      label: "Netherlands",
      leaseRules: {
        maxSecurityDepositMonths: 2,
        rentControlApplies: true,
        statutoryReferences: ["Dutch Civil Code Book 7", "Rent tribunal (Huurcommissie)"],
        requiredLeaseClauses: ["Point system rent check (liberalized sector)", "Registration with municipality where required"],
        minNoticeDaysLandlord: 60,
      },
      taxProfile: [{ id: "vat", label: "Dutch VAT", rateBasisPoints: 2100, appliesTo: ["service_fee", "short_stay"], authority: "Belastingdienst" }],
    },
    ES: {
      code: "ES",
      label: "Spain",
      leaseRules: {
        maxSecurityDepositMonths: 2,
        statutoryReferences: ["LAU (Ley de Arrendamientos Urbanos)", "Regional tenant protections"],
        requiredLeaseClauses: ["Energy certificate", "Deposit in separate account where required"],
        minNoticeDaysLandlord: 30,
      },
      taxProfile: [{ id: "vat", label: "Spanish VAT", rateBasisPoints: 2100, appliesTo: ["service_fee", "short_stay"], authority: "AEAT" }],
    },
    IT: {
      code: "IT",
      label: "Italy",
      leaseRules: {
        maxSecurityDepositMonths: 3,
        statutoryReferences: ["Codice Civile art. 1571", "Canone concordato in designated zones"],
        requiredLeaseClauses: ["Registration with Agenzia delle Entrate", "APE energy certificate"],
        minNoticeDaysLandlord: 90,
      },
      taxProfile: [{ id: "vat", label: "Italian VAT", rateBasisPoints: 2200, appliesTo: ["service_fee", "short_stay"], authority: "Agenzia delle Entrate" }],
    },
    PT: {
      code: "PT",
      label: "Portugal",
      leaseRules: {
        maxSecurityDepositMonths: 2,
        rentControlApplies: true,
        statutoryReferences: ["NRAU", "Lisbon/Porto rent update limits"],
        minNoticeDaysLandlord: 120,
      },
      taxProfile: [{ id: "vat", label: "Portuguese VAT", rateBasisPoints: 2300, appliesTo: ["service_fee", "short_stay"], authority: "Autoridade Tributária" }],
    },
    BE: {
      code: "BE",
      label: "Belgium",
      leaseRules: {
        maxSecurityDepositMonths: 3,
        statutoryReferences: ["Regional tenancy laws (Flanders/Wallonia/Brussels)"],
        requiredLeaseClauses: ["Region-specific lease form", "Deposit via blocked account (common practice)"],
        minNoticeDaysLandlord: 90,
      },
      taxProfile: [{ id: "vat", label: "Belgian VAT", rateBasisPoints: 2100, appliesTo: ["service_fee", "short_stay"], authority: "FPS Finance" }],
    },
  },
  IN: {
    MH: {
      code: "MH",
      label: "Maharashtra",
      leaseRules: {
        maxSecurityDepositMonths: 3,
        statutoryReferences: ["Maharashtra Rent Control Act (legacy)", "Model Tenancy Act adoption pending"],
        requiredLeaseClauses: ["Stamp duty on lease deed", "Police verification (common practice)"],
        minNoticeDaysLandlord: 30,
      },
    },
    DL: {
      code: "DL",
      label: "Delhi NCR",
      leaseRules: {
        maxSecurityDepositMonths: 2,
        statutoryReferences: ["Delhi Rent Control Act", "Registration of lease where term > 11 months"],
        requiredLeaseClauses: ["Notarized lease for terms exceeding 11 months"],
        minNoticeDaysLandlord: 30,
      },
    },
    KA: {
      code: "KA",
      label: "Karnataka",
      leaseRules: {
        maxSecurityDepositMonths: 3,
        statutoryReferences: ["Karnataka Model Tenancy Act draft adoption", "Bangalore tenancy practice"],
        minNoticeDaysLandlord: 30,
      },
    },
    TN: {
      code: "TN",
      label: "Tamil Nadu",
      leaseRules: {
        maxSecurityDepositMonths: 2,
        statutoryReferences: ["Tamil Nadu Regulation of Rights and Responsibilities of Landlords and Tenants Act"],
        minNoticeDaysLandlord: 30,
      },
    },
    TG: {
      code: "TG",
      label: "Telangana",
      leaseRules: {
        maxSecurityDepositMonths: 2,
        statutoryReferences: ["Telangana tenancy registration (Hyderabad)"],
        minNoticeDaysLandlord: 30,
      },
    },
  },
  GH: GHANA_SUBDIVISION_OVERLAYS,
  KE: {
    NBI: {
      code: "NBI",
      label: "Nairobi County",
      leaseRules: {
        maxAdvanceRentMonths: 6,
        maxSecurityDepositMonths: 2,
        statutoryReferences: ["Nairobi City County rent guidelines", "Landlord and Tenant (Shops) Act"],
        requiredLeaseClauses: ["Statutory notice for commercial premises", "Deposit refund timeline"],
        minNoticeDaysLandlord: 30,
      },
      taxProfile: [
        {
          id: "vat",
          label: "VAT (Nairobi)",
          rateBasisPoints: 1600,
          appliesTo: ["service_fee", "short_stay"],
          authority: "KRA",
          notes: "Nairobi City County property rates billed separately",
        },
      ],
    },
    MSA: {
      code: "MSA",
      label: "Mombasa County",
      leaseRules: {
        statutoryReferences: ["Mombasa County tourism/coastal lease rules", "Coastal strip land consent where applicable"],
        minNoticeDaysLandlord: 30,
      },
      taxProfile: [
        {
          id: "tourism_levy",
          label: "Mombasa coastal bed levy",
          rateBasisPoints: 0,
          appliesTo: ["short_stay"],
          notes: "County tourism levy on short-stay hosts — verify with Mombasa County",
        },
      ],
    },
    KIS: {
      code: "KIS",
      label: "Kisumu County",
      leaseRules: {
        statutoryReferences: ["Kisumu County tenancy practice", "Lake Victoria basin property disclosures"],
        minNoticeDaysLandlord: 30,
      },
      taxProfile: [
        {
          id: "withholding_rent",
          label: "Residential rent WHT (Kisumu)",
          rateBasisPoints: 750,
          appliesTo: ["rent"],
          authority: "KRA",
          notes: "Apply standard 7.5% WHT; county property rates separate",
        },
      ],
    },
    NKR: {
      code: "NKR",
      label: "Nakuru County",
      leaseRules: {
        statutoryReferences: ["Nakuru County agricultural/residential lease mix", "Rift Valley land board consent for agricultural plots"],
        minNoticeDaysLandlord: 30,
      },
    },
    KMB: {
      code: "KMB",
      label: "Kiambu County",
      leaseRules: {
        statutoryReferences: ["Kiambu County (Nairobi metro corridor)", "Building plan approval disclosures"],
        requiredLeaseClauses: ["County development levy disclosure where applicable"],
        minNoticeDaysLandlord: 30,
      },
      taxProfile: [
        {
          id: "vat",
          label: "VAT + Kiambu county fees",
          rateBasisPoints: 1600,
          appliesTo: ["service_fee"],
          authority: "KRA / Kiambu County",
          notes: "Metro corridor — verify county trade licence for commercial landlords",
        },
      ],
    },
  },
  ZA: {
    GT: {
      code: "GT",
      label: "Gauteng",
      leaseRules: {
        statutoryReferences: ["Rental Housing Act 1999", "Gauteng rental housing tribunal"],
        requiredLeaseClauses: ["Deposit in interest-bearing account", "Inspection-in/out within 3 days"],
        maxSecurityDepositMonths: 1,
        minNoticeDaysLandlord: 20,
      },
      taxProfile: [
        {
          id: "vat",
          label: "VAT (Gauteng)",
          rateBasisPoints: 1500,
          appliesTo: ["service_fee", "short_stay"],
          authority: "SARS",
          notes: "Municipal property rates — City of Joburg / Tshwane billed separately",
        },
      ],
    },
    WC: {
      code: "WC",
      label: "Western Cape",
      leaseRules: {
        statutoryReferences: ["Western Cape rental housing tribunal", "City of Cape Town water/electricity clearance on exit"],
        maxSecurityDepositMonths: 1,
        minNoticeDaysLandlord: 20,
      },
      taxProfile: [
        {
          id: "vat",
          label: "VAT (Western Cape)",
          rateBasisPoints: 1500,
          appliesTo: ["service_fee", "short_stay"],
          authority: "SARS",
          notes: "Coastal short-stay — verify City of Cape Town accommodation levy",
        },
      ],
    },
    KZN: {
      code: "KZN",
      label: "KwaZulu-Natal",
      leaseRules: {
        statutoryReferences: ["KZN rental housing tribunal", "Coastal property body corporate disclosures"],
        maxSecurityDepositMonths: 1,
        minNoticeDaysLandlord: 20,
      },
      taxProfile: [
        {
          id: "tourism_levy",
          label: "KZN tourism levy",
          rateBasisPoints: 0,
          appliesTo: ["short_stay"],
          notes: "Durban / coastal municipalities may levy tourism accommodation fees",
        },
      ],
    },
    EC: {
      code: "EC",
      label: "Eastern Cape",
      leaseRules: {
        statutoryReferences: ["Eastern Cape rental housing tribunal", "Rural customary lease consent documentation"],
        maxSecurityDepositMonths: 1,
        minNoticeDaysLandlord: 20,
      },
      taxProfile: [
        {
          id: "withholding_rent",
          label: "Non-resident WHT (EC)",
          rateBasisPoints: 750,
          appliesTo: ["rent"],
          authority: "SARS",
          notes: "Standard 7.5% WHT on rent to non-residents",
        },
      ],
    },
    LP: {
      code: "LP",
      label: "Limpopo",
      leaseRules: {
        statutoryReferences: ["Limpopo rental housing tribunal", "Traditional authority consent for tribal land"],
        maxSecurityDepositMonths: 1,
        minNoticeDaysLandlord: 20,
      },
    },
    MP: {
      code: "MP",
      label: "Mpumalanga",
      leaseRules: {
        statutoryReferences: ["Mpumalanga rental housing tribunal", "Mining belt lease disclosures"],
        maxSecurityDepositMonths: 1,
        minNoticeDaysLandlord: 20,
      },
    },
  },
  GB: {
    ENG: {
      code: "ENG",
      label: "England",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Housing Act 1988 (AST)", "Tenant Fees Act 2019", "Homes (Fitness for Human Habitation) Act 2018"],
        requiredLeaseClauses: ["Deposit protection scheme within 30 days", "How to Rent guide", "Right to Rent check", "Gas safety certificate"],
        minNoticeDaysLandlord: 60,
      },
    },
    SCT: {
      code: "SCT",
      label: "Scotland",
      leaseRules: {
        statutoryReferences: ["Private Housing (Tenancies) (Scotland) Act 2016", "Private Residential Tenancy (PRT)"],
        requiredLeaseClauses: ["Tenant Information Pack", "Repairing standard", "No security deposit cap — landlord guarantee alternative common"],
        minNoticeDaysLandlord: 28,
      },
    },
    WLS: {
      code: "WLS",
      label: "Wales",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Renting Homes (Wales) Act 2016", "Occupation contract standard terms"],
        requiredLeaseClauses: ["Rent Smart Wales registration", "Fitness for human habitation"],
        minNoticeDaysLandlord: 60,
      },
    },
    NIR: {
      code: "NIR",
      label: "Northern Ireland",
      leaseRules: {
        maxSecurityDepositMonths: 1,
        statutoryReferences: ["Private Tenancies Act (NI) 2022", "Tenancy deposit scheme"],
        requiredLeaseClauses: ["Deposit protected within 28 days", "Written tenancy statement"],
        minNoticeDaysLandlord: 28,
      },
    },
  },
};

/** UI dropdown options per jurisdiction (sorted by label). */
export const SUBDIVISION_OPTIONS: Partial<Record<CountryCode, SubdivisionOption[]>> = Object.fromEntries(
  Object.entries(SUBDIVISION_OVERLAYS).map(([jurisdictionId, map]) => [
    jurisdictionId,
    Object.values(map)
      .map(({ code, label }) => ({ code, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ])
) as Partial<Record<CountryCode, SubdivisionOption[]>>;

export function getSubdivisionOverlay(
  jurisdictionId: CountryCode,
  subdivisionCode?: string | null
): SubdivisionOverlay | null {
  const code = subdivisionCode?.trim().toUpperCase();
  if (!code) return null;
  return SUBDIVISION_OVERLAYS[jurisdictionId]?.[code] ?? null;
}

export function mergeLeaseRules(base: LeaseRuleSet, overlay?: Partial<LeaseRuleSet>): LeaseRuleSet {
  if (!overlay) return base;
  return {
    ...base,
    ...overlay,
    statutoryReferences: overlay.statutoryReferences
      ? [...new Set([...overlay.statutoryReferences, ...base.statutoryReferences])]
      : base.statutoryReferences,
    requiredLeaseClauses: overlay.requiredLeaseClauses
      ? [...new Set([...overlay.requiredLeaseClauses, ...base.requiredLeaseClauses])]
      : base.requiredLeaseClauses,
  };
}

export function mergeTaxProfile(base: TaxComponent[], patches?: TaxComponent[]): TaxComponent[] {
  if (!patches?.length) return base;
  const map = new Map(base.map((t) => [t.id, { ...t }]));
  for (const patch of patches) {
    const existing = map.get(patch.id);
    map.set(patch.id, existing ? { ...existing, ...patch } : { ...patch });
  }
  return Array.from(map.values());
}

/** Jurisdictions that support sub-national rule overlays in the UI. */
export const SUBDIVISION_ENABLED_JURISDICTIONS: CountryCode[] = [
  "GH", "NG", "KE", "ZA", "GB", "US", "CA", "AU", "AE", "EU", "IN",
];
