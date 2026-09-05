import { describe, expect, it } from "vitest";
import {
  filterByPropertyScope,
  filterEstatesByPropertyScope,
  filterByNestedPropertyScope,
  isPropertyAccessible,
} from "./member-scope";

describe("member-scope", () => {
  const properties = [
    { id: "prop-a", property_id: "prop-a" },
    { id: "prop-b", property_id: "prop-b" },
    { id: "prop-c", property_id: "prop-c" },
  ];

  const estates = [
    { id: "estate-1", property_id: "prop-a" },
    { id: "estate-2", property_id: "prop-b" },
    { id: "estate-3", property_id: null },
  ];

  it("returns all items for organization scope", () => {
    expect(filterByPropertyScope(properties, "organization", ["prop-a"])).toHaveLength(3);
    expect(filterEstatesByPropertyScope(estates, "organization", ["prop-a"])).toHaveLength(3);
  });

  it("filters listings and estates to scoped property ids", () => {
    expect(filterByPropertyScope(properties, "properties", ["prop-a", "prop-c"])).toEqual([
      properties[0],
      properties[2],
    ]);
    expect(filterEstatesByPropertyScope(estates, "properties", ["prop-a"])).toEqual([estates[0]]);
  });

  it("excludes unlinked estates from property scope", () => {
    expect(filterEstatesByPropertyScope(estates, "properties", ["prop-b"])).toEqual([estates[1]]);
    expect(filterEstatesByPropertyScope(estates, "properties", ["prop-c"])).toEqual([]);
  });

  it("supports nested property scope for maintenance-like rows", () => {
    const rows = [
      { id: "m1", listing: { property: { id: "prop-a" } } },
      { id: "m2", listing: { property: { id: "prop-b" } } },
    ];
    const scoped = filterByNestedPropertyScope(
      rows,
      (row) => row.listing?.property?.id,
      "properties",
      ["prop-b"],
    );
    expect(scoped).toEqual([rows[1]]);
  });

  it("honours bypass for platform viewers", () => {
    expect(filterByPropertyScope(properties, "properties", ["prop-a"], true)).toHaveLength(3);
    expect(isPropertyAccessible("prop-z", "properties", ["prop-a"], true)).toBe(true);
  });
});
