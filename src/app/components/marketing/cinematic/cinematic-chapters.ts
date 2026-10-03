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
  primaryCta?: { label: string; href: string; id?: string };
  secondaryCta?: { label: string; href: string; id?: string };
  short?: boolean;
};

export const CINEMATIC_CHAPTERS: CinematicChapter[] = [
  {
    id: "hero",
    eyebrow: "BAYTMIFTAH",
    title: "The operating system for real estate.",
    lead: "Run discovery, leasing, operations, finance, maintenance and AI from one connected platform.",
    alignClass: "mk-cinema-chapter__inner--left",
    primaryCta: { label: "Explore BaytMiftah", href: "#chapter-platform", id: "cinema-cta-explore" },
    secondaryCta: { label: "See how it works", href: "#chapter-enter", id: "cinema-cta-how" },
  },
  {
    id: "enter",
    title: "One property.\nEvery operation connected.",
    labels: ["Leasing", "Payments", "Maintenance", "Residents", "Operations"],
    short: true,
  },
  {
    id: "platform",
    eyebrow: "Platform",
    title: "One system for the entire property lifecycle.",
    lead: "From first enquiry to rent collection and maintenance, every workflow stays connected.",
    tall: true,
    mobileCards: [
      { title: "Listings", sub: "Discovery & inventory" },
      { title: "CRM", sub: "Leads & relationships" },
      { title: "Finance", sub: "Collections & ledger" },
      { title: "Maintenance", sub: "Tickets & field ops" },
      { title: "Leasing", sub: "Apply · sign · renew" },
      { title: "AI", sub: "Governed automation" },
    ],
  },
  {
    id: "portfolio",
    title: "From one property to an entire portfolio.",
    lead: "Give owners, managers, agents and finance teams one shared source of truth.",
    mobileCards: [
      { title: "Occupancy", sub: "Illustrative workspace metric" },
      { title: "Collections", sub: "Live ledger preview" },
      { title: "Open maintenance", sub: "Queue view" },
      { title: "Portfolio value", sub: "Reporting module" },
    ],
  },
  {
    id: "consumer",
    title: "A better experience for residents too.",
    lead: "Search, apply, sign, pay and request support without leaving BaytMiftah.",
    mobileCards: [
      { title: "Discover", sub: "Search & compare" },
      { title: "Apply", sub: "Digital applications" },
      { title: "Sign", sub: "E-signatures" },
      { title: "Pay", sub: "MoMo & bank-ready" },
      { title: "Maintain", sub: "Support requests" },
    ],
  },
  {
    id: "ai",
    title: "AI that understands the operation.",
    lead: "BaytMiftah connects context across properties, people and workflows to help teams act faster.",
    aiPrompts: [
      "Summarize this portfolio",
      "Flag overdue rent",
      "Prioritize maintenance",
      "Draft a listing",
      "Prepare owner update",
    ],
    alignClass: "mk-cinema-chapter__inner--center",
  },
  {
    id: "brand",
    title: "Run real estate from one place.",
    lead: "BaytMiftah brings discovery, operations and ownership into one connected system.",
    alignClass: "mk-cinema-chapter__inner--center",
    primaryCta: { label: "Get started", href: "/signup", id: "cinema-cta-start" },
    secondaryCta: { label: "View platform", href: "#chapter-platform", id: "cinema-cta-platform" },
  },
];

export const CINEMATIC_CHAPTER_COUNT = CINEMATIC_CHAPTERS.length;
