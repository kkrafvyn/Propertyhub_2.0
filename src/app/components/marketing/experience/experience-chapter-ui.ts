import type { ProductPresentationVariant } from "../cinematic/ProductPresentation";

export type ExperienceChapterUi = {
  tall?: boolean;
  short?: boolean;
  alignClass?: "mk-cinema-chapter__inner--center" | "mk-cinema-chapter__inner--left" | "mk-cinema-chapter__inner--right";
  headingLevel?: "h1" | "h2";
  productStage?: ProductPresentationVariant;
  showHierarchy?: boolean;
  mobileCards?: { title: string; sub: string }[];
};

export const EXPERIENCE_CHAPTER_UI: Record<string, ExperienceChapterUi> = {
  hero: { headingLevel: "h1", alignClass: "mk-cinema-chapter__inner--left" },
  approach: { short: true, alignClass: "mk-cinema-chapter__inner--right" },
  explode: { alignClass: "mk-cinema-chapter__inner--left", short: true },
  operating: { tall: true, productStage: "dashboard", alignClass: "mk-cinema-chapter__inner--left" },
  portfolio: { productStage: "portfolio", alignClass: "mk-cinema-chapter__inner--right" },
  unit: { short: true, showHierarchy: true, alignClass: "mk-cinema-chapter__inner--left" },
  leasing: { productStage: "leasing", alignClass: "mk-cinema-chapter__inner--right" },
  finance: { productStage: "finance", alignClass: "mk-cinema-chapter__inner--left" },
  maintenance: { productStage: "maintenance", alignClass: "mk-cinema-chapter__inner--right" },
  resident: { alignClass: "mk-cinema-chapter__inner--left" },
  ai: { alignClass: "mk-cinema-chapter__inner--left" },
  final: { alignClass: "mk-cinema-chapter__inner--center" },
};

export const HIERARCHY_STAGES = ["Portfolio", "Property", "Floor", "Unit", "Resident"] as const;
