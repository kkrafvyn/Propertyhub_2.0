import { describe, expect, it } from "vitest";
import {
  buildAbsoluteSearchUrl,
  buildAlertSearchInput,
  buildSearchPath,
  matchesAlertSearch,
} from "./search-sharing";

describe("search sharing helpers", () => {
  it("builds a shareable search path from filters", () => {
    expect(
      buildSearchPath({
        q: "East Legon",
        listingType: "sale",
        propertyType: "apartment",
        bedrooms: 3,
      })
    ).toBe("/search?q=East+Legon&listingType=sale&propertyType=apartment&bedrooms=3");
  });

  it("builds an absolute search url", () => {
    expect(
      buildAbsoluteSearchUrl(
        {
          q: "Osu",
          listingType: "rental",
        },
        "https://baytmiftah.example/"
      )
    ).toBe("https://baytmiftah.example/search?q=Osu&listingType=rental");
  });

  it("derives search input from a saved alert", () => {
    expect(
      buildAlertSearchInput({
        location_query: "Airport Residential",
        listing_type: "sale",
        property_type: "house",
        bedrooms: 4,
      })
    ).toEqual({
      q: "Airport Residential",
      listingType: "sale",
      propertyType: "house",
      priceMin: null,
      priceMax: null,
      bedrooms: 4,
      bathrooms: null,
    });
  });

  it("matches the current search to an alert definition", () => {
    const alert = {
      location_query: "Labone",
      listing_type: "lease",
      property_type: "office",
      price_min: 12000,
      price_max: 45000,
      bedrooms: null,
      bathrooms: 2,
    };

    expect(
      matchesAlertSearch(alert, {
        q: "Labone",
        listingType: "lease",
        propertyType: "office",
        priceMin: 12000,
        priceMax: 45000,
        bathrooms: 2,
        ref: "agency-123",
        channel: "directory",
      })
    ).toBe(true);
  });
});
