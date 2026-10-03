import type { ProductPreviewKind } from "../cinematic/CinematicProductPreviews";

export type ExperienceChapterUi = {
  tall?: boolean;
  short?: boolean;
  alignClass?: "mk-cinema-chapter__inner--center" | "mk-cinema-chapter__inner--left";
  headingLevel?: "h1" | "h2";
  labels?: string[];
  productPreviews?: ProductPreviewKind[];
  aiPrompts?: string[];
  leasingSteps?: string[];
  maintenanceSteps?: string[];
  orgRoles?: string[];
  mobileCards?: { title: string; sub: string }[];
};

export const EXPERIENCE_CHAPTER_UI: Record<string, ExperienceChapterUi> = {
  hero: { headingLevel: "h1", alignClass: "mk-cinema-chapter__inner--left" },
  approach: {
    labels: ["Leasing", "Finance", "Maintenance", "Residents"],
    short: true,
  },
  explode: { alignClass: "mk-cinema-chapter__inner--center", short: true },
  operating: {
    tall: true,
    productPreviews: ["portfolio", "listings", "payments", "maintenance"],
    mobileCards: [
      { title: "Portfolio", sub: "Occupancy overview" },
      { title: "Collections", sub: "Rent & receipts" },
      { title: "Maintenance", sub: "Open queue" },
      { title: "Leasing", sub: "Applications" },
    ],
  },
  portfolio: {
    productPreviews: ["portfolio", "payments", "maintenance"],
    mobileCards: [
      { title: "Occupancy", sub: "Illustrative" },
      { title: "Rent due", sub: "Illustrative" },
      { title: "Collections", sub: "Illustrative" },
      { title: "Active leases", sub: "Illustrative" },
    ],
  },
  unit: { short: true },
  leasing: {
    leasingSteps: ["Enquiry", "Application", "Verification", "Lease", "Signature", "Move-in"],
    productPreviews: ["leads"],
  },
  finance: { productPreviews: ["payments", "portfolio"] },
  maintenance: {
    productPreviews: ["maintenance"],
    maintenanceSteps: [
      "Resident reports",
      "Triage",
      "Contractor assigned",
      "Work begins",
      "Inspection",
      "Completed",
    ],
  },
  resident: { productPreviews: ["resident"] },
  ai: {
    aiPrompts: [
      "Summarize portfolio",
      "Prioritize maintenance",
      "Draft owner update",
      "Review overdue rent",
      "Prepare listing",
    ],
    orgRoles: ["Owner", "Manager", "Finance", "Agent", "Operations"],
    productPreviews: ["portfolio"],
  },
  final: { alignClass: "mk-cinema-chapter__inner--center" },
};
