import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase", () => ({ supabase: {} }));
vi.mock("./communication.service", () => ({ communicationService: {} }));
vi.mock("./listing.service", () => ({ listingService: {} }));
import { savedSearchAlertService } from "./saved-search-alert.service";
describe("saved search links", () => {
  it("preserves exact supported search criteria including zero budgets", () => {
    const url = savedSearchAlertService.buildSearchUrlFromAlert({ location_query: "East Legon & Osu", listing_type: "sale", property_type: "apartment", price_min: 0, price_max: 1000, bedrooms: 2, bathrooms: 1 });
    const params = new URL(url, "https://baytmiftah.com").searchParams;
    expect(params.get("q")).toBe("East Legon & Osu");
    expect(params.get("priceMin")).toBe("0");
    expect(params.get("priceMax")).toBe("1000");
    expect(params.get("bedrooms")).toBe("2");
    expect(params.get("listingType")).toBe("sale");
  });
});
