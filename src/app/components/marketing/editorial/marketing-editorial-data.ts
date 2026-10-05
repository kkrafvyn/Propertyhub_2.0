/** Illustrative sample data for marketing demonstrations only. */

export const SAMPLE_PORTFOLIO = {
  name: "Sample portfolio - preview",
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
  tenant: "Sample record (illustrative)",
};

export const SAMPLE_PAYMENTS = {
  rentDue: "GHS 4,200 - due in 5 days",
  lastReceipt: "Receipt #4821 - matched",
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
    q: "What does BaytMiftah bring together?",
    a: "The app connects property records, listings, applications, leases, collections, maintenance, documents, reporting, and workspace controls.",
  },
  {
    q: "How do I get started?",
    a: "Create an account, set up a workspace, add properties and units, configure the modules you need, and import existing records when ready.",
  },
  {
    q: "Can we import existing data?",
    a: "Yes. Workspace import and export tools support structured migration. Available formats and timing depend on the records being moved.",
  },
  {
    q: "Can I use the app on mobile?",
    a: "The web experience is responsive, and mobile app availability is shown only when official store releases are configured.",
  },
  {
    q: "How is pricing determined?",
    a: "Plans are based on workspace needs, portfolio size, enabled modules, and rollout support. Start free or book a demo to choose the right setup.",
  },
  {
    q: "How does AI work?",
    a: "AI features use limited tools, action logs, and human approval paths. Marketing examples are illustrative and never represent live account data.",
  },
];
