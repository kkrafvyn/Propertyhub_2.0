import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("./supabase", () => ({
  supabase: {
    functions: {
      invoke: mocks.invokeMock,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              status: "pending",
              listing_id: "l1",
              check_in: "2026-01-01",
              check_out: "2026-01-03",
            },
          }),
        }),
      }),
    }),
    rpc: vi.fn(),
  },
}));

vi.mock("./notification.service", () => ({
  notificationService: { notifyBookingEvent: vi.fn() },
}));

import { bookingService } from "./booking.service";

describe("bookingService.cancelBookingWithRefund", () => {
  beforeEach(() => {
    mocks.invokeMock.mockReset();
    mocks.invokeMock.mockResolvedValue({
      data: { booking: { id: "b1", status: "cancelled" } },
      error: null,
    });
  });

  it("uses cancel-short-stay-booking edge function", async () => {
    await bookingService.cancelBookingWithRefund("b1", "guest request");
    expect(mocks.invokeMock).toHaveBeenCalledWith("cancel-short-stay-booking", {
      body: { bookingId: "b1", reason: "guest request" },
    });
  });
});
