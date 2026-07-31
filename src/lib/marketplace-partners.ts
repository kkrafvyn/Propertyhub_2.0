export type MarketplacePartner = {
  id: string;
  name: string;
  category: "mortgage" | "insurance";
  description: string;
  highlights: string[];
  typicalRate?: string;
  coverage?: string;
  contactLabel?: string;
};

export const MORTGAGE_PARTNERS: MarketplacePartner[] = [
  {
    id: "gcb",
    name: "GCB Bank",
    category: "mortgage",
    description: "Home purchase loans for salaried and self-employed buyers in Ghana.",
    highlights: ["Up to 20-year terms", "Salary-backed applications", "Property valuation support"],
    typicalRate: "From ~22% p.a.",
    contactLabel: "Request introduction",
  },
  {
    id: "stanbic",
    name: "Stanbic Bank Ghana",
    category: "mortgage",
    description: "Mortgage financing for primary residences and investment property.",
    highlights: ["Joint applications", "Insurance bundling", "Digital statement review"],
    typicalRate: "From ~21% p.a.",
    contactLabel: "Request introduction",
  },
  {
    id: "fidelity",
    name: "Fidelity Bank",
    category: "mortgage",
    description: "Flexible mortgage products for first-time and move-up buyers.",
    highlights: ["Competitive LTV options", "Local underwriting", "Fast pre-qualification"],
    typicalRate: "From ~23% p.a.",
    contactLabel: "Request introduction",
  },
  {
    id: "republic",
    name: "Republic Bank Ghana",
    category: "mortgage",
    description: "Residential mortgages with structured repayment plans.",
    highlights: ["Construction-stage drawdowns", "Refinance options", "Diaspora-friendly docs"],
    typicalRate: "Varies by profile",
    contactLabel: "Request introduction",
  },
];

export const INSURANCE_PARTNERS: MarketplacePartner[] = [
  {
    id: "enterprise",
    name: "Enterprise Insurance",
    category: "insurance",
    description: "Home and contents cover for owners and landlords.",
    highlights: ["Fire & flood cover", "Theft protection", "Optional contents add-on"],
    coverage: "From GHS 150 / year",
    contactLabel: "Request quote",
  },
  {
    id: "hollard",
    name: "Hollard Ghana",
    category: "insurance",
    description: "Property insurance for residential and small commercial assets.",
    highlights: ["Replacement value options", "Claims support", "Bundle with life cover"],
    coverage: "Custom quote",
    contactLabel: "Request quote",
  },
  {
    id: "sic",
    name: "SIC Insurance",
    category: "insurance",
    description: "Building insurance aligned with mortgage and purchase workflows.",
    highlights: ["Mortgage-compliant policies", "Nationwide agents", "Digital certificates"],
    coverage: "Custom quote",
    contactLabel: "Request quote",
  },
  {
    id: "star",
    name: "Star Assurance",
    category: "insurance",
    description: "Home insurance for new purchases and leasehold improvements.",
    highlights: ["Tenant improvements", "Landlord liability", "Fast policy issuance"],
    coverage: "From GHS 120 / year",
    contactLabel: "Request quote",
  },
];

export const VENDOR_CATEGORIES = [
  { id: "plumbing", label: "Plumbing" },
  { id: "electrical", label: "Electrical" },
  { id: "hvac", label: "HVAC / AC" },
  { id: "cleaning", label: "Cleaning" },
  { id: "security", label: "Security" },
  { id: "general", label: "General maintenance" },
] as const;
