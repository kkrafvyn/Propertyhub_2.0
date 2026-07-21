import { describe, expect, it } from "vitest";
import { notificationService } from "./notification.service";

describe("notificationService", () => {
  it("maps notification types to categories", () => {
    expect(notificationService.categoryForType("booking_confirmed")).toBe("Bookings");
    expect(notificationService.categoryForType("maintenance_status_updated")).toBe("Maintenance");
    expect(notificationService.categoryForType("counter_offer_submitted")).toBe("Offers");
    expect(notificationService.categoryForType("rent_due")).toBe("Transactions");
    expect(notificationService.categoryForType("message_received")).toBe("Messages");
  });

  it("reports external provider availability from env", () => {
    expect(notificationService.areExternalProvidersConfigured()).toEqual({
      webPush: false,
    });
  });
});
