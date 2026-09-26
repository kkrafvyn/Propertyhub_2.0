import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("./supabase", () => ({ supabase: { rpc: mocks.rpc } }));
import { ownerOversightService, shouldRequestOwnerExpenseApproval } from "./owner-oversight.service";

describe("atomic owner access", () => {
  beforeEach(() => mocks.rpc.mockReset());

  it("adds access and an agreement with one call and preserves the requested mode", async () => {
    const agreement = { id: "agreement-b", property_id: "property-b" };
    mocks.rpc.mockResolvedValue({ data: agreement, error: null });
    await expect(ownerOversightService.ensureOwnerScopedMembership({
      organizationId: "org", userId: "owner", propertyId: "property-b",
      estateId: "estate-b", mode: "hybrid",
    })).resolves.toBe(agreement);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("add_owner_property_access", {
      p_property_id: "property-b", p_owner_user_id: "owner", p_managing_organization_id: "org",
      p_estate_id: "estate-b", p_management_mode: "hybrid",
    });
  });

  it("surfaces a transactional failure without a client-side scope mutation", async () => {
    const error = new Error("Estate must match the property and managing organization");
    mocks.rpc.mockResolvedValue({ data: null, error });
    await expect(ownerOversightService.ensureOwnerScopedMembership({
      organizationId: "org", userId: "owner", propertyId: "property-b",
    })).rejects.toBe(error);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});

describe("owner expense approval thresholds", () => {
  it("skips when approve_expenses is disabled", () => {
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 500_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: false,
      }),
    ).toBe(false);
  });

  it("auto-approves amounts below the threshold", () => {
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 50_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: true,
      }),
    ).toBe(false);
  });

  it("requests owner approval at or above the auto-approve floor", () => {
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 100_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: true,
      }),
    ).toBe(true);
    expect(
      shouldRequestOwnerExpenseApproval({
        amountMinor: 250_000,
        autoApproveBelowMinor: 100_000,
        approveExpenses: true,
      }),
    ).toBe(true);
  });
});
