import { describe, expect, it } from "vitest";
import { resolveBookingPaymentAction } from "./booking-payment-action";

describe("resolveBookingPaymentAction", () => {
  const base = {
    id: "b1",
    listing_id: "l1",
    total_minor: 50000,
    currency: "GHS",
    check_in: "2099-01-10",
  };

  it("offers pay now for approved request bookings without payment", () => {
    const action = resolveBookingPaymentAction({
      ...base,
      status: "confirmed",
      booking_mode: "request",
      transaction_id: null,
    });
    expect(action.kind).toBe("pay_now");
    expect(action.checkoutPath).toContain("bookingId=b1");
  });

  it("offers resume payment for pending instant bookings", () => {
    const action = resolveBookingPaymentAction({
      ...base,
      status: "pending",
      booking_mode: "instant",
      transaction_id: null,
    });
    expect(action.kind).toBe("resume_payment");
    expect(action.label).toBe("Resume payment");
  });

  it("marks expired pending instant bookings after check-in date", () => {
    const action = resolveBookingPaymentAction({
      ...base,
      status: "pending",
      booking_mode: "instant",
      transaction_id: null,
      check_in: "2020-01-01",
    });
    expect(action.kind).toBe("expired");
    expect(action.disabled).toBe(true);
  });
});
