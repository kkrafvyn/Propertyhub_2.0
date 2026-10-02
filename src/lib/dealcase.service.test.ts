import { beforeEach, describe, expect, it, vi } from "vitest";
import { dealCaseService } from "./dealcase.service";

const fromMock = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

function mockDealCasesSelect(selectFn: (selectArg: string) => void) {
  fromMock.mockReturnValue({
    select: vi.fn().mockImplementation((selectArg: string) => {
      selectFn(selectArg);
      return {
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  });
}

describe("dealCaseService", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("disambiguates deal_cases → users embed via user_id foreign key", async () => {
    let selectArg = "";
    mockDealCasesSelect((arg) => {
      selectArg = arg;
    });

    await dealCaseService.getDealCasesByOrganization("org-123");

    expect(fromMock).toHaveBeenCalledWith("deal_cases");
    expect(selectArg).toContain("users!deal_cases_user_id_fkey");
    expect(selectArg).not.toMatch(/user:users\(/);
  });
});
