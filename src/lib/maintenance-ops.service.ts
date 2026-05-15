import type { Database } from "./database.types";
import { vendorService } from "./vendor.service";

type VendorAssignmentRow = Database["public"]["Tables"]["vendor_assignments"]["Row"] & {
  vendor?: Database["public"]["Tables"]["vendors"]["Row"] | null;
  property?: Database["public"]["Tables"]["properties"]["Row"] | null;
};

const SERVICE_TYPE_CATEGORY_MAP: Record<string, string> = {
  cleaning: "cleaner",
  deep_cleaning: "cleaner",
  move_out_cleaning: "cleaner",
  plumbing: "plumber",
  electrical: "electrician",
  painting: "painter",
  carpentry: "carpenter",
  moving: "mover",
  internet: "internet_provider",
  security: "security",
};

function normalizeValue(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

export function inferVendorCategory(serviceType?: string | null) {
  const normalized = normalizeValue(serviceType);
  return SERVICE_TYPE_CATEGORY_MAP[normalized] || normalized || "cleaner";
}

export function buildMaintenanceSummary(assignments: VendorAssignmentRow[]) {
  const totalSpend = assignments.reduce((sum, assignment) => sum + Number(assignment.cost || 0), 0);
  return {
    total: assignments.length,
    pending: assignments.filter((assignment) => assignment.status === "pending").length,
    accepted: assignments.filter((assignment) => assignment.status === "accepted").length,
    inProgress: assignments.filter((assignment) => assignment.status === "in_progress").length,
    completed: assignments.filter((assignment) => assignment.status === "completed").length,
    cancelled: assignments.filter((assignment) => assignment.status === "cancelled").length,
    totalSpend,
  };
}

export const maintenanceOpsService = {
  async getRecommendedVendors(input: {
    serviceType: string;
    neighborhood?: string | null;
    city?: string | null;
    region?: string | null;
    limit?: number;
  }) {
    const category = inferVendorCategory(input.serviceType);
    const serviceAreas = [input.neighborhood, input.city, input.region].filter(Boolean) as string[];

    if (serviceAreas.length > 0) {
      try {
        const vendors = await vendorService.searchVendors(serviceAreas, category, input.limit || 8);
        if (vendors.length > 0) return vendors;
      } catch (error) {
        console.error("Failed to search vendors by service area:", error);
      }
    }

    return vendorService.getVerifiedVendors(category, input.limit || 8);
  },

  async createMaintenanceRequest(input: {
    organizationId: string;
    propertyId: string;
    vendorId: string;
    serviceType: string;
    description: string;
    requestedDate: Date;
    cost?: number | null;
  }) {
    const assignment = await vendorService.createAssignment(
      input.organizationId,
      input.propertyId,
      input.vendorId,
      input.serviceType,
      input.description,
      input.requestedDate
    );

    if (input.cost != null && Number.isFinite(input.cost)) {
      return vendorService.updateAssignment(assignment.id, {
        cost: Number(input.cost),
      });
    }

    return assignment;
  },

  async getAssignments(organizationId: string) {
    return vendorService.getAssignments(organizationId);
  },

  async getAssignmentsForPropertyReferences(
    references: Array<{ organizationId?: string | null; propertyId?: string | null }>
  ) {
    const propertyIds = new Set(
      references.map((reference) => reference.propertyId).filter(Boolean) as string[]
    );
    const organizationIds = Array.from(
      new Set(references.map((reference) => reference.organizationId).filter(Boolean) as string[])
    );

    if (propertyIds.size === 0 || organizationIds.length === 0) {
      return [] as VendorAssignmentRow[];
    }

    const results = await Promise.all(
      organizationIds.map((organizationId) =>
        this.getAssignments(organizationId).catch(() => [] as VendorAssignmentRow[])
      )
    );

    return results
      .flat()
      .filter((assignment) => propertyIds.has(assignment.property_id))
      .sort(
        (a, b) =>
          new Date(b.requested_date || 0).getTime() - new Date(a.requested_date || 0).getTime()
      );
  },

  async updateAssignment(
    assignmentId: string,
    updates: Database["public"]["Tables"]["vendor_assignments"]["Update"]
  ) {
    return vendorService.updateAssignment(assignmentId, updates);
  },
};
