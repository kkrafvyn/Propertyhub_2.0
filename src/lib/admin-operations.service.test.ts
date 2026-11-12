import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./supabase", () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }));
import { supabase } from "./supabase";
import {
  adminOperationsService,
  adminSearchFilter,
  fetchAdminRecords,
} from "./admin-operations.service";
const uuid = "10000000-0000-0000-0000-000000000001";
beforeEach(() => vi.clearAllMocks());
describe("admin queries and mutation validation", () => {
  it("searches UUID columns only for valid IDs and strips filter operators", () => {
    expect(adminSearchFilter("communications", uuid)).toContain(
      `organization_id.eq.${uuid}`,
    );
    expect(adminSearchFilter("accounts", "smith@example.test")).toContain(
      "email.ilike.%smith@example.test%",
    );
    const filter = adminSearchFilter(
      "accounts",
      "x),is_platform_admin.eq.true,(%",
    );
    expect(filter).not.toContain("),");
    expect(filter).not.toContain("(%");
  });
  it("uses a bounded server range and a stable secondary sort", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi
        .fn()
        .mockResolvedValue({ data: [{ id: uuid }], count: 77, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as never);
    expect(
      await fetchAdminRecords("communications", {
        search: "failure",
        status: "failed",
        organization: uuid,
        page: 2,
      }),
    ).toEqual({ rows: [{ id: uuid }], count: 77 });
    expect(chain.range).toHaveBeenCalledWith(50, 74);
    expect(chain.order).toHaveBeenLastCalledWith("id", { ascending: false });
    expect(chain.eq).toHaveBeenCalledWith("organization_id", uuid);
  });
  it("does not submit invalid account IDs or budgets", async () => {
    expect(() =>
      adminOperationsService.createCase({
        subject: "Recovery",
        category: "mfa_recovery",
        accountId: "bad",
        note: "Enough context to review",
      }),
    ).toThrow(/valid IDs/);
    expect(() =>
      adminOperationsService.setAiControl(uuid, "finance", true, 1.5),
    ).toThrow(/whole-number/);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
