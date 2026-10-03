/** Illustrative sample data for marketing demonstrations only. */

export const SAMPLE_PORTFOLIO = {
  name: "Sample portfolio · preview",
  properties: [
    { id: "p1", name: "Airport Hills · Block B", units: 24, occupancy: "22 occupied" },
    { id: "p2", name: "East Legon · Terrace Row", units: 12, occupancy: "11 occupied" },
    { id: "p3", name: "Cantonments · Office Annex", units: 8, occupancy: "6 occupied" },
  ],
};

export const SAMPLE_PROPERTY = {
  id: "p1",
  title: "Airport Hills · Block B",
  unit: "Unit 204",
  listingStatus: "Published",
  leaseStatus: "Active lease",
  tenant: "Sample tenant (illustrative)",
};

export const SAMPLE_PAYMENTS = {
  rentDue: "GHS 4,200 · due in 5 days",
  lastReceipt: "MoMo receipt #4821 · matched",
  openCases: "1 promise-to-pay tracked",
};

export const SAMPLE_MAINTENANCE = {
  ticket: "MT-2041",
  title: "Plumbing · kitchen leak",
  status: "Assigned",
  stages: ["Submitted", "Triaged", "Assigned", "In progress", "Completed"] as const,
  activeStage: 2,
};

export type MarketingRoleId = "owner" | "manager" | "agent" | "finance" | "resident";

export const MARKETING_ROLES: Array<{
  id: MarketingRoleId;
  label: string;
  benefit: string;
  workflows: string[];
  previewTitle: string;
  previewLines: string[];
  cta: { label: string; href: string };
}> = [
  {
    id: "owner",
    label: "Owner",
    benefit: "See occupancy, collections, and open work across properties without chasing updates.",
    workflows: ["Portfolio overview", "Owner statements", "Disbursements"],
    previewTitle: "Owner oversight",
    previewLines: ["3 properties · 44 units", "Collections queue: 12 items", "Statements: monthly PDF"],
    cta: { label: "Create workspace", href: "/signup" },
  },
  {
    id: "manager",
    label: "Property manager",
    benefit: "Run listings, leasing, maintenance, and team tasks from one workspace.",
    workflows: ["Listings & compliance", "Leads & leasing", "Maintenance dispatch"],
    previewTitle: "Operations workspace",
    previewLines: ["6 open maintenance tickets", "2 viewings this week", "Listing draft: Unit 18"],
    cta: { label: "Create workspace", href: "/signup" },
  },
  {
    id: "agent",
    label: "Agent",
    benefit: "Track enquiries, applications, and handoffs with shared property context.",
    workflows: ["Lead pipeline", "Applications", "Listing publication"],
    previewTitle: "Leasing pipeline",
    previewLines: ["Stage: Application review", "Ghana Card check: pending", "Lease template: standard"],
    cta: { label: "Create workspace", href: "/signup" },
  },
  {
    id: "finance",
    label: "Finance team",
    benefit: "Match receipts, monitor arrears, and align collections with ledger workflows.",
    workflows: ["Collections cases", "Payments import", "Trust accounting views"],
    previewTitle: "Collections",
    previewLines: ["Unmatched credits: 2", "Arrears bucket: 30+ days", "Receipt import: CSV ready"],
    cta: { label: "Create workspace", href: "/signup" },
  },
  {
    id: "resident",
    label: "Resident",
    benefit: "Search homes, apply, sign, pay, and request support through the consumer experience.",
    workflows: ["Search & apply", "E-signatures", "Rent payments", "Support requests"],
    previewTitle: "Resident app",
    previewLines: ["Application: submitted", "Lease: ready to sign", "Pay rent: MoMo ready"],
    cta: { label: "Search homes", href: "/search" },
  },
];

export const WORKFLOW_STAGES = [
  { id: "listing", label: "Listing", detail: "Publish inventory with media, pricing, and compliance fields." },
  { id: "enquiry", label: "Enquiry", detail: "Capture leads and schedule viewings in the CRM pipeline." },
  { id: "application", label: "Application", detail: "Collect applications and screening artifacts digitally." },
  { id: "lease", label: "Lease", detail: "Generate leases and collect e-signatures." },
  { id: "payment", label: "Payment", detail: "Collect rent via supported payment partners and match receipts." },
  { id: "maintenance", label: "Maintenance", detail: "Convert requests into tracked work orders with assignments." },
] as const;

export const VERIFIED_INTEGRATIONS = [
  {
    name: "PayAngels",
    status: "available" as const,
    detail: "Supported payment rail for MoMo, bank, and card flows when configured for your organization.",
  },
  {
    name: "Prembly KYC",
    status: "conditional" as const,
    detail: "Identity verification widgets and webhooks when API keys and organisation setup are complete.",
  },
  {
    name: "Resend email",
    status: "conditional" as const,
    detail: "Transactional email when RESEND_API_KEY and sender domain are configured.",
  },
  {
    name: "Supabase",
    status: "available" as const,
    detail: "Auth, database, storage, and edge functions powering the platform.",
  },
];

export const MARKETS_NOTE =
  "The product supports multi-currency configuration and Ghana-focused leasing workflows (including Act 220 tooling in workspace). Market-specific payment and KYC availability depends on your organization's live configuration.";

export const MARKETING_FAQ = [
  {
    q: "Who is BaytMiftah for?",
    a: "Property managers, owner-operators, agencies, and finance teams running residential and mixed portfolios — plus residents using the consumer search and self-service flows.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, set up or join a workspace, add properties and units, invite teammates, and connect payments or KYC when your organization enables them.",
  },
  {
    q: "Can residents use BaytMiftah?",
    a: "Yes. Residents can search listings, apply, sign documents, pay through supported payment methods, and open maintenance or support requests where enabled.",
  },
  {
    q: "Which payments are supported?",
    a: "PayAngels is the documented payment rail in this repository. Availability of MoMo, bank, or card checkout depends on merchant configuration and environment setup.",
  },
  {
    q: "Is there a mobile app?",
    a: "Capacitor-based consumer and business mobile shells exist in the repository. Store links appear when VITE_IOS_APP_URL and VITE_ANDROID_APP_URL are configured.",
  },
  {
    q: "Can we import existing data?",
    a: "The product includes data import/export tooling in workspace. Scope and formats depend on your migration plan — use documented import flows rather than ad-hoc spreadsheets where possible.",
  },
  {
    q: "How is pricing determined?",
    a: "Subscription plans are managed in the admin revenue module (Starter, Professional, Enterprise). Public list pricing is not published on this marketing page — start signup or contact sales through existing channels.",
  },
  {
    q: "How does AI work?",
    a: "Workspace AI features use tool allowlists, action logs, and human approval paths documented in the AI command center. Marketing examples are illustrative, not live tenant data.",
  },
];
