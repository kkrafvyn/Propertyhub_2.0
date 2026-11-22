import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { MobileBookingQuickFilters, mobileBookingFilterUrl } from "./MobileBookingQuickFilters";

describe("Mobile booking quick filters", () => {
  it("keeps the transaction and property type when adding a quick filter", () => {
    expect(mobileBookingFilterUrl(
      "/search?listingType=rental&propertyType=apartment&page=3",
      { bedrooms: "2" },
    )).toBe("/search?listingType=rental&propertyType=apartment&bedrooms=2");
  });

  it("opens actual search routes without claiming availability", () => {
    render(
      <MemoryRouter>
        <MobileBookingQuickFilters searchBaseUrl="/search?listingType=short_stay" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Verified organizations" })).toHaveAttribute(
      "href",
      "/search?listingType=short_stay&verified=1",
    );
    expect(screen.getByRole("link", { name: "Explore map" })).toHaveAttribute(
      "href",
      "/search?listingType=short_stay&view=map",
    );
    expect(screen.queryByText(/available today/i)).not.toBeInTheDocument();
  });
});
