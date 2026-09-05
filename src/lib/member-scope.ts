import type { MemberRole } from "./workspace";
import { getRoleCatalogEntry } from "./company-model";

export type MemberScopeMode = "organization" | "properties" | "assigned_work";

export type MemberScopeProps = {
  scopeMode?: MemberScopeMode | null;
  scopedPropertyIds?: string[] | null;
  bypassPropertyScope?: boolean;
};

export function withMemberScopeDefaults(props?: Partial<MemberScopeProps>) {
  return {
    scopeMode: (props?.scopeMode ?? "organization") as MemberScopeMode,
    scopedPropertyIds: props?.scopedPropertyIds ?? null,
    bypassPropertyScope: props?.bypassPropertyScope ?? false,
  };
}

export function getNestedListingPropertyId(item: {
  listing?: { property?: { id?: string } | null } | null;
}): string | null | undefined {
  const property = item.listing?.property;
  if (!property) return null;
  if (Array.isArray(property)) return property[0]?.id;
  return property.id;
}

const PROPERTY_SCOPED_DEPARTMENTS = new Set([
  "property",
  "maintenance",
  "sales",
]);

const ASSIGNED_WORK_ROLES = new Set<MemberRole>(["technician", "contractor", "vendor", "caretaker"]);

export function defaultScopeModeForRole(role: MemberRole | null | undefined): MemberScopeMode {
  if (!role) return "organization";
  if (ASSIGNED_WORK_ROLES.has(role)) return "assigned_work";

  const department = getRoleCatalogEntry(role)?.department;
  if (department && PROPERTY_SCOPED_DEPARTMENTS.has(department)) {
    return "properties";
  }

  return "organization";
}

export function shouldUsePropertyScopeFilter(
  scopeMode: MemberScopeMode | null | undefined,
  propertyIds: string[] | null | undefined,
): boolean {
  return scopeMode === "properties" && Boolean(propertyIds?.length);
}

export function isPropertyAccessible(
  propertyId: string,
  scopeMode: MemberScopeMode | null | undefined,
  propertyIds: string[] | null | undefined,
  bypassScope = false,
): boolean {
  if (bypassScope || !scopeMode || scopeMode === "organization") return true;
  if (scopeMode === "assigned_work") return false;
  if (!propertyIds?.length) return true;
  return propertyIds.includes(propertyId);
}

export function filterByPropertyScope<T extends { id?: string; property_id?: string | null }>(
  items: T[],
  scopeMode: MemberScopeMode | null | undefined,
  propertyIds: string[] | null | undefined,
  bypassScope = false,
): T[] {
  if (!shouldUsePropertyScopeFilter(scopeMode, propertyIds) || bypassScope) {
    return items;
  }

  const allowed = new Set(propertyIds);
  return items.filter((item) => {
    const propertyId = item.property_id || item.id;
    return propertyId ? allowed.has(propertyId) : false;
  });
}

export function filterByNestedPropertyScope<T>(
  items: T[],
  getPropertyId: (item: T) => string | null | undefined,
  scopeMode: MemberScopeMode | null | undefined,
  propertyIds: string[] | null | undefined,
  bypassScope = false,
): T[] {
  if (!shouldUsePropertyScopeFilter(scopeMode, propertyIds) || bypassScope) {
    return items;
  }

  const allowed = new Set(propertyIds);
  return items.filter((item) => {
    const propertyId = getPropertyId(item);
    return propertyId ? allowed.has(propertyId) : false;
  });
}

export function filterEstatesByPropertyScope<T extends { id: string; property_id?: string | null }>(
  estates: T[],
  scopeMode: MemberScopeMode | null | undefined,
  propertyIds: string[] | null | undefined,
  bypassScope = false,
): T[] {
  if (!shouldUsePropertyScopeFilter(scopeMode, propertyIds) || bypassScope) {
    return estates;
  }

  const allowed = new Set(propertyIds);
  return estates.filter((estate) => {
    if (!estate.property_id) return false;
    return allowed.has(estate.property_id);
  });
}
