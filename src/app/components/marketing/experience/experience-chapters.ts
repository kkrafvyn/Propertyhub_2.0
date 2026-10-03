/** Scroll-normalized chapter bands for the continuous product film (0–1). */

export type ExperienceChapterId =
  | "hero"
  | "approach"
  | "explode"
  | "operating"
  | "portfolio"
  | "unit"
  | "leasing"
  | "finance"
  | "maintenance"
  | "resident"
  | "ai"
  | "final";

export const EXPERIENCE_CHAPTER_BANDS: Record<ExperienceChapterId, [number, number]> = {
  hero: [0, 0.08],
  approach: [0.08, 0.17],
  explode: [0.17, 0.27],
  operating: [0.27, 0.37],
  portfolio: [0.37, 0.47],
  unit: [0.47, 0.57],
  leasing: [0.57, 0.67],
  finance: [0.67, 0.76],
  maintenance: [0.76, 0.84],
  resident: [0.84, 0.91],
  ai: [0.91, 0.97],
  final: [0.97, 1],
};

export type ExperienceChapterCopy = {
  id: ExperienceChapterId;
  eyebrow?: string;
  title: string;
  lead?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export const EXPERIENCE_CHAPTERS: ExperienceChapterCopy[] = [
  {
    id: "hero",
    eyebrow: "BaytMiftah",
    title: "Real estate,\noperated as one system.",
    lead: "BaytMiftah connects leasing, finance, maintenance, residents and portfolio operations in one platform.",
    primaryCta: { label: "Explore BaytMiftah", href: "#chapter-operating" },
    secondaryCta: { label: "For organizations", href: "#chapter-final" },
  },
  {
    id: "approach",
    eyebrow: "Approach",
    title: "Every operation\nhas a place.",
    lead: "Leasing, finance, maintenance and residents — connected around the property.",
  },
  {
    id: "explode",
    title: "One property.\nEvery operation connected.",
    lead: "Each floor reflects how teams run the building — from leasing to finance to AI oversight.",
  },
  {
    id: "operating",
    eyebrow: "Platform",
    title: "One system for the\nproperty lifecycle.",
    lead: "Workspace modules appear where work happens — illustrative previews, not live tenant data.",
  },
  {
    id: "portfolio",
    title: "From one property\nto an entire portfolio.",
    lead: "Pull back to a master-plan view — occupancy, collections, and maintenance across assets.",
  },
  {
    id: "unit",
    title: "See the whole portfolio.\nThen go down to one unit.",
    lead: "Portfolio → property → unit → resident — one hierarchy, shared context.",
  },
  {
    id: "leasing",
    title: "From enquiry\nto signed lease.",
    lead: "Applications, verification, lease documents and move-in — in one leasing workflow.",
  },
  {
    id: "finance",
    title: "Know what came in,\nwhat is due,\nand where it goes.",
    lead: "Collections, owner statements, payouts and transaction activity — finance workspace styling.",
  },
  {
    id: "maintenance",
    title: "From reported\nto resolved.",
    lead: "Every maintenance request stays visible from issue to completion.",
  },
  {
    id: "resident",
    title: "Residents get\none place too.",
    lead: "Search, apply, sign, pay, visitor access and support — without fragmented systems.",
  },
  {
    id: "ai",
    title: "AI with\noperational context.",
    lead: "Ask across finance, leasing, maintenance and occupancy — with human approval where you require it.",
  },
  {
    id: "final",
    title: "Operate real estate\nfrom one place.",
    lead: "BaytMiftah connects discovery, leasing, operations, finance and residents in one operating system.",
    primaryCta: { label: "Explore BaytMiftah", href: "#chapter-operating" },
    secondaryCta: { label: "Get started", href: "/signup" },
  },
];

/** Optional GLB — drop file at public path to replace procedural geometry. */
export const PROPERTY_GLB_PATH = "/models/baytmiftah-property.glb";

export const ANCHOR_NAMES = [
  "heroAnchor",
  "leasingAnchor",
  "financeAnchor",
  "maintenanceAnchor",
  "residentAnchor",
  "roofAnchor",
] as const;
