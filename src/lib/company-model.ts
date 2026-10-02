import type { MemberRole } from "./workspace";
import type { WorkspacePermission } from "./workspace-permissions";
import { getMemberPermissions } from "./workspace-permissions";

/** First-class company business types (multi-select). */
export type CompanyBusinessType =
  | "property_owner"
  | "property_management"
  | "agency_brokerage"
  | "developer"
  | "investment_portfolio"
  | "facility_management"
  | "construction_services"
  | "contractor_services"
  | "hybrid";

/** Operational capabilities a company can enable. */
export type CompanyCapability =
  | "ownership"
  | "management"
  | "sales"
  | "leasing"
  | "development"
  | "facilities"
  | "construction"
  | "services";

export type DepartmentKey =
  | "executive"
  | "property"
  | "sales"
  | "finance"
  | "maintenance"
  | "support"
  | "procurement"
  | "administration"
  | "analytics";

export interface CompanyTypeDefinition {
  id: CompanyBusinessType;
  label: string;
  description: string;
  defaultCapabilities: CompanyCapability[];
}

export interface DepartmentDefinition {
  key: DepartmentKey;
  label: string;
  description: string;
}

export interface RoleCatalogEntry {
  role: MemberRole;
  label: string;
  department: DepartmentKey;
  description: string;
  invitable: boolean;
}

export const COMPANY_TYPE_DEFINITIONS: CompanyTypeDefinition[] = [
  {
    id: "property_owner",
    label: "Property Owner / Holdings",
    description: "Own and operate your own portfolio.",
    defaultCapabilities: ["ownership", "management", "leasing"],
  },
  {
    id: "property_management",
    label: "Property Management",
    description: "Manage properties on behalf of owners.",
    defaultCapabilities: ["management", "leasing", "facilities"],
  },
  {
    id: "agency_brokerage",
    label: "Real Estate Agency / Brokerage",
    description: "Sell and lease properties for clients.",
    defaultCapabilities: ["sales", "leasing"],
  },
  {
    id: "developer",
    label: "Property Developer",
    description: "Develop projects, sell units, and manage handover.",
    defaultCapabilities: ["development", "sales", "ownership"],
  },
  {
    id: "investment_portfolio",
    label: "Investment / Portfolio Company",
    description: "Track portfolio performance and income.",
    defaultCapabilities: ["ownership", "management"],
  },
  {
    id: "facility_management",
    label: "Facility Management",
    description: "Operate buildings, maintenance, and SLAs.",
    defaultCapabilities: ["facilities", "management"],
  },
  {
    id: "construction_services",
    label: "Construction / Development Services",
    description: "Deliver construction and project work.",
    defaultCapabilities: ["construction", "development"],
  },
  {
    id: "contractor_services",
    label: "Property Services / Contractor",
    description: "Provide maintenance and field services to property companies.",
    defaultCapabilities: ["services"],
  },
  {
    id: "hybrid",
    label: "Hybrid Real Estate Company",
    description: "Multiple activities: own, manage, sell, lease, or develop.",
    defaultCapabilities: ["ownership", "management", "sales", "leasing", "development"],
  },
];

export const CAPABILITY_DEFINITIONS: Record<
  CompanyCapability,
  { label: string; description: string }
> = {
  ownership: { label: "Property ownership", description: "Portfolio and asset ownership workflows." },
  management: { label: "Property management", description: "Units, tenants, leases, and operations." },
  sales: { label: "Sales & brokerage", description: "Listings, leads, viewings, and deals." },
  leasing: { label: "Leasing", description: "Applications, leases, and tenant onboarding." },
  development: { label: "Development", description: "Projects, units, reservations, and handover." },
  facilities: { label: "Facilities", description: "Maintenance, inspections, vendors, and SLAs." },
  construction: { label: "Construction", description: "Projects, procurement, and delivery." },
  services: { label: "Field services", description: "Assigned jobs and contractor workflows." },
};

export const DEPARTMENT_DEFINITIONS: DepartmentDefinition[] = [
  { key: "executive", label: "Executive", description: "Leadership and company-wide oversight." },
  { key: "property", label: "Property Operations", description: "Properties, units, tenants, and leases." },
  { key: "sales", label: "Sales & Leasing", description: "Pipeline, viewings, and conversions." },
  { key: "finance", label: "Finance", description: "Invoices, collections, and reporting." },
  { key: "maintenance", label: "Maintenance", description: "Work orders, technicians, and vendors." },
  { key: "support", label: "Customer Service", description: "Resident support and ticket routing." },
  { key: "procurement", label: "Procurement", description: "Vendors, purchase orders, and spend." },
  { key: "administration", label: "Administration", description: "Team, settings, and integrations." },
  { key: "analytics", label: "Analytics", description: "Reports, KPIs, and operational analysis." },
];

export const ROLE_CATALOG: RoleCatalogEntry[] = [
  { role: "owner", label: "Owner / Founder", department: "executive", description: "Full organization control.", invitable: false },
  { role: "managing_director", label: "Managing Director / CEO", department: "executive", description: "Executive leadership and portfolio strategy.", invitable: true },
  { role: "organization_admin", label: "Organization Admin", department: "administration", description: "Team, roles, settings, and integrations.", invitable: true },
  { role: "head_property_management", label: "Head of Property Management", department: "property", description: "Portfolio-wide property operations.", invitable: true },
  { role: "property_manager", label: "Property Manager", department: "property", description: "Daily property and tenant operations.", invitable: true },
  { role: "manager", label: "Operations Manager", department: "property", description: "Cross-functional operational management.", invitable: true },
  { role: "facilities_manager", label: "Facilities Manager", department: "maintenance", description: "Building operations and preventive maintenance.", invitable: true },
  { role: "estate_officer", label: "Estate Officer", department: "property", description: "Field inspections and on-site coordination.", invitable: true },
  { role: "caretaker", label: "Caretaker", department: "maintenance", description: "On-site presence and defect logging.", invitable: true },
  { role: "sales_manager", label: "Head of Sales / Leasing", department: "sales", description: "Pipeline, agents, and conversions.", invitable: true },
  { role: "agent", label: "Leasing Agent", department: "sales", description: "Lead follow-up, viewings, and lease drafting.", invitable: true },
  { role: "sales_agent", label: "Sales Agent", department: "sales", description: "Property sales and buyer negotiations.", invitable: true },
  { role: "marketing_manager", label: "Marketing Manager", department: "sales", description: "Campaigns and listing promotion.", invitable: true },
  { role: "marketing_officer", label: "Marketing Officer", department: "sales", description: "Listing marketing and channel support.", invitable: true },
  { role: "finance_manager", label: "Finance Manager", department: "finance", description: "Ledger, reconciliation, and owner statements.", invitable: true },
  { role: "finance_officer", label: "Finance Officer / Accountant", department: "finance", description: "Invoices, allocations, and accounting entries.", invitable: true },
  { role: "collections_officer", label: "Collections Officer", department: "finance", description: "Arrears, payment plans, and escalations.", invitable: true },
  { role: "technician", label: "Technician", department: "maintenance", description: "Assigned maintenance jobs and updates.", invitable: true },
  { role: "customer_service_manager", label: "Customer Service Manager", department: "support", description: "Support team and SLA oversight.", invitable: true },
  { role: "customer_service_agent", label: "Support Agent", department: "support", description: "Resident inquiries and ticket routing.", invitable: true },
  { role: "analyst", label: "Operations Analyst", department: "analytics", description: "Dashboards, KPIs, and read-heavy reporting.", invitable: true },
  { role: "contractor", label: "Contractor / Vendor", department: "maintenance", description: "External work orders only.", invitable: true },
  { role: "vendor", label: "Vendor / Supplier", department: "maintenance", description: "Procurement and assigned vendor tasks.", invitable: true },
  { role: "property_owner", label: "Property Owner (external)", department: "executive", description: "Portfolio owner linked to managed assets; read-focused oversight.", invitable: true },
  { role: "enterprise_operator", label: "Enterprise Operator", department: "administration", description: "Cross-org enterprise operations and integrations.", invitable: true },
  { role: "developer", label: "Development Manager", department: "property", description: "Project handover and unit transition.", invitable: true },
];

/** Workspace nav slugs enabled by each capability. */
export const CAPABILITY_MODULE_SLUGS: Record<CompanyCapability, string[]> = {
  ownership: ["", "listings", "property-360", "unit-360", "portfolio-analytics", "owner-statements", "org-insights"],
  management: [
    "", "listings", "leases", "maintenance", "inspections", "estate-operations", "property-360",
    "unit-360", "tenant-screening", "leasing-applications", "service-desk", "my-work",
  ],
  sales: ["listings", "leads", "contacts", "tasks", "calendar", "market-intelligence", "advanced-search"],
  leasing: ["leases", "leasing-applications", "esignature", "leads", "contacts", "calendar"],
  development: ["listings", "property-360", "unit-360", "data-migration", "company-launchpad"],
  facilities: ["maintenance", "inspections", "technician-jobs", "contractor-work-orders", "vendors", "utility-metering"],
  construction: ["procurement", "contractor-work-orders", "bulk-operations", "data-import-export"],
  services: ["technician-jobs", "contractor-portal", "my-work", "contractor-work-orders"],
};

export const CAPABILITY_DEPARTMENTS: Record<CompanyCapability, DepartmentKey[]> = {
  ownership: ["executive", "property", "finance", "analytics"],
  management: ["executive", "property", "finance", "maintenance", "support"],
  sales: ["executive", "sales", "administration"],
  leasing: ["sales", "property", "support"],
  development: ["executive", "property", "sales", "finance"],
  facilities: ["maintenance", "procurement", "property"],
  construction: ["procurement", "maintenance", "finance"],
  services: ["maintenance"],
};

export const DEPARTMENT_HOME_SLUG: Record<DepartmentKey, string> = {
  executive: "",
  property: "estate-operations",
  sales: "leads",
  finance: "estate-finance",
  maintenance: "maintenance",
  support: "service-desk",
  procurement: "procurement",
  administration: "team",
  analytics: "org-insights",
};

export function getCompanyTypeDefinition(type: CompanyBusinessType) {
  return COMPANY_TYPE_DEFINITIONS.find((entry) => entry.id === type);
}

export function resolveCapabilitiesFromBusinessTypes(types: CompanyBusinessType[]): CompanyCapability[] {
  const capabilities = new Set<CompanyCapability>();
  for (const type of types) {
    const definition = getCompanyTypeDefinition(type);
    if (!definition) continue;
    for (const capability of definition.defaultCapabilities) {
      capabilities.add(capability);
    }
  }
  return Array.from(capabilities);
}

export function getRecommendedDepartments(capabilities: CompanyCapability[]) {
  const keys = new Set<DepartmentKey>();
  for (const capability of capabilities) {
    for (const department of CAPABILITY_DEPARTMENTS[capability] || []) {
      keys.add(department);
    }
  }
  keys.add("administration");
  return DEPARTMENT_DEFINITIONS.filter((department) => keys.has(department.key));
}

export function getRoleCatalogEntry(role: MemberRole | string | null | undefined) {
  if (!role) return null;
  return ROLE_CATALOG.find((entry) => entry.role === role) || null;
}

export function getRoleLabel(role: MemberRole | string | null | undefined) {
  return getRoleCatalogEntry(role)?.label || (role ? String(role).replace(/_/g, " ") : "Member");
}

export function getInvitableRoles() {
  return ROLE_CATALOG.filter((entry) => entry.invitable);
}

export function getRolesForDepartment(department: DepartmentKey) {
  return ROLE_CATALOG.filter((entry) => entry.department === department && entry.invitable);
}

export function groupRolesByDepartment(roles: RoleCatalogEntry[] = getInvitableRoles()) {
  const grouped = new Map<DepartmentKey, RoleCatalogEntry[]>();
  for (const entry of roles) {
    const list = grouped.get(entry.department) || [];
    list.push(entry);
    grouped.set(entry.department, list);
  }
  return grouped;
}

export function isSlugEnabledForCapabilities(slug: string, capabilities: CompanyCapability[]): boolean {
  if (!capabilities.length) return true;
  if (slug === "" || slug === "settings" || slug === "team" || slug === "my-work" || slug === "notifications") {
    return true;
  }
  return capabilities.some((capability) => CAPABILITY_MODULE_SLUGS[capability]?.includes(slug));
}

export function getRoleHomeSlug(role: MemberRole | null | undefined): string {
  const entry = getRoleCatalogEntry(role);
  if (!entry) return "";
  return DEPARTMENT_HOME_SLUG[entry.department] || "";
}

export function summarizeMemberAccess(
  role: MemberRole | null | undefined,
  customPermissions?: string[] | null,
) {
  const permissions = getMemberPermissions(role, customPermissions);
  return {
    roleLabel: getRoleLabel(role),
    permissions,
    department: getRoleCatalogEntry(role)?.department || null,
  };
}

export function formatCapabilityList(capabilities: CompanyCapability[]) {
  return capabilities.map((capability) => CAPABILITY_DEFINITIONS[capability]?.label || capability);
}
