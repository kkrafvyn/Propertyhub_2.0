import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceListings } from "./WorkspaceListings";
import { listingService } from "../../../lib/listing.service";
import { propertyService } from "../../../lib/property.service";

vi.mock("../../../lib/listing.service", () => ({
  listingService: {
    getOrganizationListings: vi.fn(),
    updateListing: vi.fn(),
    deleteListing: vi.fn(),
  },
}));

vi.mock("../../../lib/property.service", () => ({
  propertyService: {
    updateProperty: vi.fn(),
  },
}));

const getOrganizationListingsMock = vi.mocked(listingService.getOrganizationListings);
const updateListingMock = vi.mocked(listingService.updateListing);
const updatePropertyMock = vi.mocked(propertyService.updateProperty);

const organization = {
  id: "org-1",
  name: "Prime Properties",
  slug: "prime-properties",
  description: null,
  logo_url: null,
  banner_url: null,
  website: null,
  email: null,
  phone: null,
  owner_id: "user-1",
  verified: true,
  suspended: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const listing = {
  id: "listing-1",
  property_id: "property-1",
  organization_id: "org-1",
  listing_type: "sale",
  price: 250000,
  currency: "GHS",
  status: "draft",
  visibility: "private",
  featured: false,
  published_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  property: {
    id: "property-1",
    organization_id: "org-1",
    address: "5 Independence Ave",
    city: "Accra",
    region: "Greater Accra",
    country: "Ghana",
    latitude: null,
    longitude: null,
    category: "apartment",
    bedrooms: 3,
    bathrooms: 2,
    square_meters: 120,
    description: "Bright and modern apartment",
    amenities: ["Pool"],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

describe("WorkspaceListings", () => {
  it("updates property and listing records together when saving changes", async () => {
    getOrganizationListingsMock.mockResolvedValue([listing] as any);
    updatePropertyMock.mockResolvedValue({} as any);
    updateListingMock.mockResolvedValue({} as any);

    render(
      <MemoryRouter>
        <WorkspaceListings
          organization={organization as any}
          workspaceBasePath="/workspace/prime-properties"
          currentUserId="user-1"
        />
      </MemoryRouter>
    );

    expect(await screen.findByText("5 Independence Ave")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit details/i }));

    const addressInput = screen.getByLabelText("Address");
    await user.clear(addressInput);
    await user.type(addressInput, "18 Cantonments Road");

    const priceInput = screen.getByLabelText("Price");
    await user.clear(priceInput);
    await user.type(priceInput, "300000");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updatePropertyMock).toHaveBeenCalledWith("property-1", expect.objectContaining({
        address: "18 Cantonments Road",
        city: "Accra",
        region: "Greater Accra",
      }));
    });

    expect(updateListingMock).toHaveBeenCalledWith("listing-1", expect.objectContaining({
      price: 300000,
      listing_type: "sale",
      visibility: "private",
    }));
  });
});
