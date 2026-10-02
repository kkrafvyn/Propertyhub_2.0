import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageService } from "./message.service";

const fromMock = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./communication.service", () => ({
  communicationService: {},
}));

describe("messageService", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("disambiguates deal_cases → users embed in organization inbox", async () => {
    let selectArg = "";
    fromMock.mockReturnValue({
      select: vi.fn().mockImplementation((arg: string) => {
        selectArg = arg;
        return {
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }),
    });

    await messageService.getOrganizationInbox("org-123");

    expect(fromMock).toHaveBeenCalledWith("organization_conversations");
    expect(selectArg).toContain("users!deal_cases_user_id_fkey");
    expect(selectArg).not.toMatch(/user:users\(/);
  });
});
