/** Illustrative sample data for marketing demonstrations only. */

export const SAMPLE_PORTFOLIO = {
  name: "Sample Accra portfolio",
  properties: [
    { id: "p1", name: "Airport Hills - Block B", units: 24, occupancy: "22 occupied" },
    { id: "p2", name: "East Legon - Terrace Row", units: 12, occupancy: "11 occupied" },
    { id: "p3", name: "Cantonments - Office Annex", units: 8, occupancy: "6 occupied" },
  ],
};

export const SAMPLE_PROPERTY = {
  id: "p1",
  title: "Airport Hills - Block B",
  unit: "Unit 204",
  listingStatus: "Published",
  leaseStatus: "Active lease",
  tenant: "Sample tenant record",
};

export const SAMPLE_PAYMENTS = {
  rentDue: "GHS 4,200 — due in 5 days",
  lastReceipt: "Receipt #4821 — matched",
  openCases: "1 promise-to-pay tracked",
};

export const SAMPLE_MAINTENANCE = {
  ticket: "MT-2041",
  title: "Plumbing - kitchen leak",
  status: "Assigned",
  stages: ["Submitted", "Triaged", "Assigned", "In progress", "Completed"] as const,
  activeStage: 2,
};

export const WORKFLOW_STAGES = [
  { id: "listing", label: "Listing", detail: "Prepare inventory with media, pricing, and required fields." },
  { id: "enquiry", label: "Enquiry", detail: "Capture enquiries and schedule viewings in the pipeline." },
  { id: "application", label: "Application", detail: "Collect applications and review documents digitally." },
  { id: "lease", label: "Lease", detail: "Generate leases and track signatures in context." },
  { id: "payment", label: "Collection", detail: "Track rent, receipts, balances, and collection cases." },
  { id: "maintenance", label: "Maintenance", detail: "Turn requests into tracked work orders with clear status." },
] as const;

export const MARKETING_FAQ = [
  {
    q: "What is BaytMiftah?",
    a: "BaytMiftah is a Real Estate Operating System (REOS): one platform for property discovery and consumer journeys, plus a workspace for listings, leasing, collections, maintenance, and reporting.",
  },
  {
    q: "How is this different from a listings website?",
    a: "Listings are one module. BaytMiftah connects people, properties, money, and operations — from enquiry and application through lease, payment, and maintenance — with role-based workspace controls.",
  },
  {
    q: "What is the difference between the consumer app and workspace?",
    a: "The consumer app (com.baymiftah.app) is for search, applications, payments, and stays. Workspace (com.baymiftah.workspace) is for operators: CRM, listings, leases, finance, and field ops. Both use the same account and org model where applicable.",
  },
  {
    q: "Is BaytMiftah built for Ghana?",
    a: "Yes. The product supports cedis, local trust and KYC workflows, and SMS/WhatsApp omnichannel patterns common in Ghana, with international rules and multi-currency options where enabled in your workspace.",
  },
  {
    q: "How do payments work?",
    a: "BaytMiftah is a technology platform — not a bank. Payment checkout connects to configured providers (including mobile money where supported). Availability depends on workspace setup and verified provider credentials.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, explore properties, or set up a workspace and add properties and units. Import tools and module configuration depend on your rollout plan.",
  },
  {
    q: "Are the mobile apps available?",
    a: "Native apps are rolling out via Google Play closed testing and Apple App Store review. Contact us to request tester access until public store links appear on this page.",
  },
  {
    q: "How does AI work?",
    a: "Workspace AI uses limited tools, action logs, and human approval. Examples on this site use demo data — not live account data or autonomous decisions.",
  },
];
