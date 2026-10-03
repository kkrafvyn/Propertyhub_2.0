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
    title: "Real estate,\noperated as one system.",
    lead: "BaytMiftah connects leasing, finance, maintenance, residents and portfolio operations in one platform.",
    primaryCta: { label: "Explore BaytMiftah", href: "#chapter-operating" },
    secondaryCta: { label: "For organizations", href: "#chapter-final" },
  },
  {
    id: "approach",
    title: "One property.\nEvery operation connected.",
  },
  {
    id: "explode",
    title: "One property.\nEvery operation connected.",
  },
  {
    id: "operating",
    eyebrow: "Platform",
    title: "One system for the\nproperty lifecycle.",
  },
  {
    id: "portfolio",
    title: "From one property\nto an entire portfolio.",
  },
  {
    id: "unit",
    title: "See the whole portfolio.\nThen go all the way down to one unit.",
  },
  {
    id: "leasing",
    title: "From enquiry\nto signed lease.",
  },
  {
    id: "finance",
    title: "Know what came in,\nwhat is due,\nand where it goes.",
  },
  {
    id: "maintenance",
    title: "From reported\nto resolved.",
  },
  {
    id: "resident",
    title: "Residents get\none place too.",
  },
  {
    id: "ai",
    title: "AI with\noperational context.",
  },
  {
    id: "final",
    title: "Operate real estate\nfrom one place.",
    primaryCta: { label: "Explore BaytMiftah", href: "#chapter-operating" },
    secondaryCta: { label: "Get started", href: "/signup" },
  },
];

/** Optional GLB — drop file at public path to replace procedural geometry. */
export const PROPERTY_GLB_PATH = "/models/baytmiftah-property.glb";

export const ANCHOR_NAMES = [
  "heroAnchor",
  "entryAnchor",
  "leasingAnchor",
  "financeAnchor",
  "maintenanceAnchor",
  "residentAnchor",
  "aiAnchor",
  "roofAnchor",
] as const;
