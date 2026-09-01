import { describe, expect, it } from "vitest";
import {
  getTutorialDefinition,
  getTutorialStorageKey,
  resolveTutorialRole,
  type TutorialRole,
} from "./tutorials";

const roles: TutorialRole[] = [
  "consumer",
  "property_owner",
  "organization_owner",
  "executive",
  "head_property_management",
  "property_manager",
  "estate_officer",
  "maintenance_manager",
  "technician",
  "finance",
  "collections",
  "sales",
  "marketing",
  "customer_service",
  "platform_admin",
  "devops",
];

describe("role-specific tutorials", () => {
  it("defines a practical curriculum and first-task checklist for every role", () => {
    for (const role of roles) {
      const tutorial = getTutorialDefinition(role);
      expect(tutorial.label).toBeTruthy();
      expect(tutorial.intro).toBeTruthy();
      expect(tutorial.steps.length).toBeGreaterThanOrEqual(5);
      expect(tutorial.checklist.length).toBeGreaterThanOrEqual(5);
      expect(tutorial.steps.every((step) => step.title && step.description)).toBe(true);
    }
  });

  it("maps existing account roles to the right tutorial", () => {
    expect(resolveTutorialRole("consumer")).toBe("consumer");
    expect(resolveTutorialRole("host")).toBe("property_owner");
    expect(resolveTutorialRole("owner")).toBe("organization_owner");
    expect(resolveTutorialRole("property_manager")).toBe("property_manager");
    expect(resolveTutorialRole("finance_officer")).toBe("finance");
    expect(resolveTutorialRole("agent")).toBe("sales");
    expect(resolveTutorialRole("admin")).toBe("platform_admin");
    expect(resolveTutorialRole("developer")).toBe("devops");
    expect(resolveTutorialRole("unknown-role")).toBeNull();
  });

  it("keeps tutorial progress isolated per user", () => {
    expect(getTutorialStorageKey("user-a")).not.toBe(getTutorialStorageKey("user-b"));
    expect(getTutorialStorageKey("user-a")).toContain("user-a");
  });
});
