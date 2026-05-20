import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROPERTY_CATEGORY_OPTIONS,
  formatPropertyCategory,
  getPropertyCategoryIoTHints,
  normalizePropertyCategory,
} from "./property-category";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260518120000_commercial_property_types_iot_access.sql"),
  "utf8"
);
const smartAccessService = readFileSync(join(process.cwd(), "src/lib/smart-access.service.ts"), "utf8");
const workspaceSmartAccess = readFileSync(
  join(process.cwd(), "src/app/pages/workspace/WorkspaceSmartAccess.tsx"),
  "utf8"
);

describe("BaytMiftah property categories and IoT access", () => {
  it("normalizes warehouses, car parks, and office complexes as first-class property types", () => {
    expect(normalizePropertyCategory("Warehouse")).toBe("warehouse");
    expect(normalizePropertyCategory("parking lot")).toBe("car_park");
    expect(normalizePropertyCategory("office-complex")).toBe("office_complex");

    expect(formatPropertyCategory("car_park")).toBe("Car Park");
    expect(formatPropertyCategory("office_complex")).toBe("Office Complex");
    expect(PROPERTY_CATEGORY_OPTIONS.map((option) => option.value)).toEqual(
      expect.arrayContaining(["warehouse", "car_park", "office_complex"])
    );
  });

  it("adds category-specific Smart Property Access guidance", () => {
    expect(getPropertyCategoryIoTHints("warehouse").devices).toEqual(
      expect.arrayContaining(["Dock door", "Warehouse sensor", "Gate access"])
    );
    expect(getPropertyCategoryIoTHints("car parks").devices).toEqual(
      expect.arrayContaining(["Parking gate", "Occupancy counter"])
    );
    expect(getPropertyCategoryIoTHints("office complex").devices).toEqual(
      expect.arrayContaining(["Smart lock", "Parking gate"])
    );
  });

  it("widens database constraints and viewing access hooks for the new commercial classes", () => {
    for (const category of ["warehouse", "car_park", "office_complex"]) {
      expect(migrationSql).toContain(`'${category}'`);
    }

    for (const deviceType of [
      "parking_gate",
      "dock_door",
      "warehouse_sensor",
      "occupancy_counter",
      "cctv_link",
    ]) {
      expect(migrationSql).toContain(`'${deviceType}'`);
      expect(workspaceSmartAccess).toContain(deviceType);
    }

    expect(smartAccessService).toContain("ACCESS_CAPABLE_DEVICE_TYPES");
    expect(smartAccessService).toContain('"parking_gate"');
    expect(smartAccessService).toContain('"dock_door"');
  });
});
