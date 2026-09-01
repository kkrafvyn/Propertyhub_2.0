import { describe, it, expect } from "vitest";
import { invoiceMatchingService } from "./invoice-matching.service";

describe("InvoiceMatchingService", () => {
  it("should return empty list when no purchase order IDs are supplied", async () => {
    const invoices = await invoiceMatchingService.listInvoices([]);
    expect(invoices).toEqual([]);
  });
});
