import {
  generateLeaseSchedule,
  type GeneratedLeaseSchedule,
  type LeaseScheduleInput,
} from "./lease-clause-generator.service";
import {
  buildPropertyComplianceSnapshot,
  type PropertyLocationInput,
} from "./property-country-context.service";

export type LeaseTemplateKind = "residential" | "commercial" | "short_stay";

export type LeaseTemplatePreset = {
  id: string;
  kind: LeaseTemplateKind;
  label: string;
  description: string;
  listingType: LeaseScheduleInput["listingType"];
  defaultTermMonths: number;
};

export const LEASE_TEMPLATE_PRESETS: LeaseTemplatePreset[] = [
  {
    id: "residential_standard",
    kind: "residential",
    label: "Residential tenancy",
    description: "Standard residential lease with jurisdiction mandatory clauses.",
    listingType: "rental",
    defaultTermMonths: 12,
  },
  {
    id: "commercial_standard",
    kind: "commercial",
    label: "Commercial lease",
    description: "Commercial premises schedule with statutory references.",
    listingType: "commercial",
    defaultTermMonths: 36,
  },
  {
    id: "short_stay",
    kind: "short_stay",
    label: "Short-term / furnished",
    description: "Shorter term with advance rent and deposit caps highlighted.",
    listingType: "lease",
    defaultTermMonths: 6,
  },
];

export type BuildLeaseTemplateInput = LeaseScheduleInput & {
  templateId?: string;
};

/** Build a jurisdiction-aware lease document from property context + template preset. */
export function buildLeaseTemplate(input: BuildLeaseTemplateInput): GeneratedLeaseSchedule {
  const preset =
    LEASE_TEMPLATE_PRESETS.find((entry) => entry.id === input.templateId) ||
    LEASE_TEMPLATE_PRESETS[0];

  return generateLeaseSchedule({
    ...input,
    listingType: input.listingType || preset.listingType,
    termMonths: input.termMonths ?? preset.defaultTermMonths,
  });
}

/** List template presets annotated with the property's resolved jurisdiction. */
export function listTemplatesForProperty(
  property: PropertyLocationInput,
  org?: {
    default_jurisdiction?: string | null;
    default_subdivision?: string | null;
    default_currency?: string | null;
  }
) {
  const snapshot = buildPropertyComplianceSnapshot(property, org as any);
  const jurisdictionLabel = snapshot.subdivisionLabel
    ? `${snapshot.context.pack.label} · ${snapshot.subdivisionLabel}`
    : snapshot.context.pack.label;

  return LEASE_TEMPLATE_PRESETS.map((preset) => ({
    ...preset,
    jurisdictionLabel,
    jurisdictionId: snapshot.jurisdictionId,
    governingLaw: snapshot.governingLaw,
  }));
}

export const leaseTemplateService = {
  buildLeaseTemplate,
  listTemplatesForProperty,
  LEASE_TEMPLATE_PRESETS,
};
