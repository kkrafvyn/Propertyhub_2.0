import { describe, expect, it } from "vitest";
import { validateLeaseApplicationInput } from "./lease-screening.service";

describe("lease application intake contract", () => {
  it("requires a positive whole household size", () => {
    expect(validateLeaseApplicationInput({ applicantName: "Ama", applicantEmail: "ama@example.com", householdSize: 2 })).toBeNull();
    expect(validateLeaseApplicationInput({ applicantName: "Ama", applicantEmail: "ama@example.com", householdSize: 0 })).toContain("Household size");
    expect(validateLeaseApplicationInput({ applicantName: "", applicantEmail: "ama@example.com", householdSize: 1 })).toContain("name and email");
  });
});