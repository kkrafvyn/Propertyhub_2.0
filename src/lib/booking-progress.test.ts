import { describe, expect, it } from "vitest";
import { getBookingProgress } from "./booking.service";

describe("booking progress", () => {
  it("shows payment pending for a confirmed unpaid booking", () => {
    expect(getBookingProgress({ status: "confirmed" })).toEqual({
      payment: "pending",
      stay: "confirmed",
      cancellable: true,
    });
  });

  it("shows paid and checked-in state", () => {
    expect(getBookingProgress({ status: "confirmed", transaction_id: "tx-1", checked_in_at: "2026-09-26T10:00:00Z" })).toEqual({
      payment: "paid",
      stay: "checked_in",
      cancellable: false,
    });
  });

  it("does not allow cancelled bookings to be cancelled again", () => {
    expect(getBookingProgress({ status: "cancelled" }).cancellable).toBe(false);
  });
});
