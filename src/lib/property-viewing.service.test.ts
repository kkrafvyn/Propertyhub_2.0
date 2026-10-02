import { beforeEach, describe, expect, it, vi } from "vitest";
import { propertyViewingService } from "./property-viewing.service";

const fromMock = vi.fn();

vi.mock("./supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("./communication.service", () => ({
  communicationService: {},
}));

vi.mock("./organization.service", () => ({
  organizationService: {},
}));

describe("propertyViewingService", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it("disambiguates property_viewings → users embed via user_id foreign key", async () => {
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

    await propertyViewingService.getOrganizationViewings("org-123");

    expect(fromMock).toHaveBeenCalledWith("property_viewings");
    expect(selectArg).toContain("users!property_viewings_user_id_fkey");
    expect(selectArg).not.toMatch(/user:users\(/);
  });
});
