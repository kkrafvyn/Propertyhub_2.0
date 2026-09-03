import { describe, expect, it } from "vitest";
import {
  buildLeaseTemplate,
  listTemplatesForProperty,
  LEASE_TEMPLATE_PRESETS,
} from "./lease-template.service";

describe("lease-template.service", () => {
  it("lists presets annotated with Lagos jurisdiction", () => {
    const templates = listTemplatesForProperty({
      country: "Nigeria",
      region: "Lagos",
      city: "Lagos",
      subdivision_code: "LA",
    });
    expect(templates).toHaveLength(LEASE_TEMPLATE_PRESETS.length);
    expect(templates[0].jurisdictionId).toBe("NG");
    expect(templates[0].jurisdictionLabel).toContain("Lagos");
  });

  it("builds commercial template with longer default term", () => {
    const doc = buildLeaseTemplate({
      templateId: "commercial_standard",
      property: { country: "Ghana", city: "Accra", subdivision_code: "AA" },
      landlordName: "Landlord Co",
      tenantName: "Tenant Ltd",
    });
    expect(doc.markdown).toContain("Commercial");
    expect(doc.markdown).toContain("PayAngels");
  });
});
