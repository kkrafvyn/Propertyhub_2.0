import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ListingCard } from "./ListingCard";
import type { MarketplaceListingCard } from "./listing-mappers";

const listing: MarketplaceListingCard = {
  id: "listing-42",
  title: "Two-bedroom home",
  location: "East Legon, Accra",
  priceLabel: "GHS 2,200/mo",
  listingType: "rent",
  bedrooms: 2,
  rating: null,
  photos: ["/living-room.jpg", "/balcony.jpg"],
  featured: true,
  verified: true,
};

describe("ListingCard", () => {
  it("uses one detail link without nesting save or compare buttons", async () => {
    const onToggleSave = vi.fn();
    const onToggleCompare = vi.fn();
    render(
      <MemoryRouter>
        <ListingCard listing={listing} onToggleSave={onToggleSave} onToggleCompare={onToggleCompare} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: /view two-bedroom home in east legon/i });
    expect(link).toHaveAttribute("href", "/property/listing-42");
    const save = screen.getByRole("button", { name: "Save property" });
    const compare = screen.getByRole("button", { name: "Compare" });
    expect(link.contains(save)).toBe(false);
    expect(link.contains(compare)).toBe(false);

    const user = userEvent.setup();
    await user.click(save);
    await user.click(compare);
    expect(onToggleSave).toHaveBeenCalledWith("listing-42");
    expect(onToggleCompare).toHaveBeenCalledWith("listing-42");
  });

  it("labels promotional and verification status accurately", () => {
    render(<MemoryRouter><ListingCard listing={listing} /></MemoryRouter>);
    expect(screen.getByText("Featured listing")).toBeInTheDocument();
    expect(screen.getByText("Verified organization")).toBeInTheDocument();
    expect(screen.queryByText("Guest favourite")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified property")).not.toBeInTheDocument();
  });

  it("offers reachable photo navigation and only exposes the active photo", async () => {
    render(<MemoryRouter><ListingCard listing={listing} /></MemoryRouter>);
    const user = userEvent.setup();
    expect(screen.getByRole("img", { name: "Two-bedroom home" })).toHaveAttribute("src", "/living-room.jpg");
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    expect(screen.getByRole("img", { name: "Two-bedroom home" })).toHaveAttribute("src", "/balcony.jpg");
  });

  it("shows a clear fallback when the listing has no photos", () => {
    render(<MemoryRouter><ListingCard listing={{ ...listing, photos: [] }} /></MemoryRouter>);
    expect(screen.getByRole("img", { name: "Property photo unavailable" })).toBeInTheDocument();
  });
});
