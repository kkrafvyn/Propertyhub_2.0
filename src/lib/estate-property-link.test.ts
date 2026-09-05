import { describe, expect, it, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn(() => ({
  eq: vi.fn(() => ({
    maybeSingle: mockMaybeSingle,
    is: vi.fn(() => Promise.resolve({ data: [], error: null })),
  })),
  is: vi.fn(() => Promise.resolve({ data: [], error: null })),
}));
const mockInsert = vi.fn(() => ({
  select: vi.fn(() => ({
    single: vi.fn(() =>
      Promise.resolve({
        data: { id: "estate-1", property_id: "prop-1", name: "12 Main, Accra" },
        error: null,
      }),
    ),
  })),
}));
const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() =>
        Promise.resolve({
          data: { id: "estate-2", property_id: "prop-1", name: "Existing Estate" },
          error: null,
        }),
      ),
    })),
  })),
}));

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "properties") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: {
                    id: "prop-1",
                    organization_id: "org-1",
                    address: "12 Main Street",
                    city: "Accra",
                    region: "Greater Accra",
                  },
                  error: null,
                }),
              ),
            })),
          })),
        };
      }
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      };
    }),
  },
}));

describe("estate-property-link.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it("creates a linked estate when none exists", async () => {
    const { ensureEstateForProperty } = await import("./estate-property-link.service");
    const estate = await ensureEstateForProperty({
      id: "prop-1",
      organization_id: "org-1",
      address: "12 Main Street",
      city: "Accra",
      region: "Greater Accra",
    });

    expect(estate?.property_id).toBe("prop-1");
    expect(mockInsert).toHaveBeenCalled();
  });

  it("returns an existing linked estate", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: "estate-9", property_id: "prop-1", name: "Linked" },
      error: null,
    });

    const { ensureEstateForProperty } = await import("./estate-property-link.service");
    const estate = await ensureEstateForProperty({
      id: "prop-1",
      organization_id: "org-1",
      address: "12 Main Street",
    });

    expect(estate?.id).toBe("estate-9");
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
