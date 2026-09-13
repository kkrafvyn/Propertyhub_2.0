import { describe, expect, it } from "vitest";
import { orgActivityService } from "./org-activity.service";

describe("orgActivityService", () => {
  it("treats owner and managing director as executives", () => {
    expect(orgActivityService.isExecutiveRole("owner")).toBe(true);
    expect(orgActivityService.isExecutiveRole("managing_director")).toBe(true);
    expect(orgActivityService.isExecutiveRole("organization_admin")).toBe(true);
  });

  it("does not treat agent or analyst as executives", () => {
    expect(orgActivityService.isExecutiveRole("agent")).toBe(false);
    expect(orgActivityService.isExecutiveRole("analyst")).toBe(false);
    expect(orgActivityService.isExecutiveRole(null)).toBe(false);
  });
});
