import type { ProductPreviewKind } from "./CinematicProductPreviews";

export type CinematicChapter = {
  id: string;
  eyebrow?: string;
  title: string;
  lead?: string;
  labels?: string[];
  alignClass?: "mk-cinema-chapter__inner--center" | "mk-cinema-chapter__inner--left";
  tall?: boolean;
  aiPrompts?: string[];
  mobileCards?: { title: string; sub: string }[];
  productPreviews?: ProductPreviewKind[];
  primaryCta?: { label: string; href: string; id?: string };
  secondaryCta?: { label: string; href: string; id?: string };
  short?: boolean;
  headingLevel?: "h1" | "h2";
};

export const CINEMATIC_CHAPTERS: CinematicChapter[] = [
  {
    id: "hero",
    eyebrow: "BAYTMIFTAH",
    title: "Property operations software for teams that manage real homes.",
    lead: "BaytMiftah helps property managers, owners, and agencies run listings, leasing, payments, maintenance, and resident support in one workspace.",
    alignClass: "mk-cinema-chapter__inner--left",
    headingLevel: "h1",
    primaryCta: { label: "Create your workspace", href: "/signup", id: "cinema-cta-signup" },
    secondaryCta: { label: "See the platform", href: "#chapter-platform", id: "cinema-cta-platform" },
  },
  {
    id: "enter",
    title: "From enquiry to keys — without switching tools.",
    lead: "Publish inventory, qualify leads, sign leases, collect rent, and dispatch maintenance with shared context on every unit.",
    labels: ["Listings", "Leads", "Leasing", "Payments", "Maintenance"],
    productPreviews: ["listings", "leads", "maintenance"],
    short: true,
  },
  {
    id: "platform",
    eyebrow: "Platform",
    title: "One workspace for day-to-day property work.",
    lead: "Each module reflects how BaytMiftah is built: operational screens your team can open today — previews below use illustrative data.",
    tall: true,
    productPreviews: ["listings", "leads", "payments", "maintenance"],
    mobileCards: [
      { title: "Listings", sub: "Publish & track status" },
      { title: "Leads", sub: "Pipeline & viewings" },
      { title: "Payments", sub: "Collections & receipts" },
      { title: "Maintenance", sub: "Assign & track work" },
    ],
  },
  {
    id: "portfolio",
    title: "Scale from one building to a full portfolio.",
    lead: "Owners and operations leads see occupancy, open work, renewals, and collections in one overview — aligned with the workspace dashboard.",
    productPreviews: ["portfolio", "payments", "maintenance"],
    mobileCards: [
      { title: "Portfolio view", sub: "Multi-property overview" },
      { title: "Collections", sub: "Payment queue preview" },
      { title: "Maintenance", sub: "Open work orders" },
      { title: "Leasing", sub: "Renewals & applications" },
    ],
  },
  {
    id: "consumer",
    title: "Residents stay in the loop.",
    lead: "Search listings, apply digitally, sign documents, pay rent, and open support requests — the same flows available in the consumer experience.",
    productPreviews: ["resident"],
    mobileCards: [
      { title: "Discover", sub: "Search & compare" },
      { title: "Apply", sub: "Digital applications" },
      { title: "Sign", sub: "E-signatures" },
      { title: "Pay", sub: "Licensed payment partners" },
      { title: "Support", sub: "Maintenance requests" },
    ],
  },
  {
    id: "ai",
    title: "AI that respects your approvals.",
    lead: "BaytMiftah AI can summarize portfolios, flag overdue rent, prioritize maintenance, and draft communications — with tool allowlists and human sign-off where you require it.",
    aiPrompts: [
      "Summarize open maintenance by property",
      "Flag overdue rent this week",
      "Draft owner update for renewals",
      "Prioritize tickets breaching SLA",
    ],
    alignClass: "mk-cinema-chapter__inner--center",
  },
  {
    id: "brand",
    title: "Get started with verified capabilities.",
    lead: "Create a workspace, connect your portfolio, and invite your team. Marketplace listings, payments, and KYC integrations follow the setup flows documented in the product.",
    alignClass: "mk-cinema-chapter__inner--center",
    primaryCta: { label: "Create your workspace", href: "/signup", id: "cinema-cta-start" },
    secondaryCta: { label: "Log in", href: "/login", id: "cinema-cta-login" },
  },
];

export const CINEMATIC_CHAPTER_COUNT = CINEMATIC_CHAPTERS.length;
