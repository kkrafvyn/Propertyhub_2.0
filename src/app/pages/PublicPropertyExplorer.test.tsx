import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PublicPropertyExplorer } from "./PublicPropertyExplorer";
import { listingService } from "../../lib/listing.service";

vi.mock("../../lib/listing.service", () => ({
  listingService: {
    getListingById: vi.fn(),
  },
}));

const getListingByIdMock = vi.mocked(listingService.getListingById);

const listing = {
  id: "listing-1",
  listing_type: "rental",
  status: "listed",
  visibility: "public",
  price: 4200,
  currency: "GHS",
  published_at: "2026-05-12T00:00:00.000Z",
  created_at: "2026-05-12T00:00:00.000Z",
  updated_at: "2026-05-12T00:00:00.000Z",
  organization: {
    name: "Prime Properties",
    verified: true,
    slug: "prime-properties",
  },
  property: {
    id: "property-1",
    address: "5 Independence Ave",
    city: "Accra",
    region: "Greater Accra",
    country: "Ghana",
    category: "apartment",
    bedrooms: 3,
    bathrooms: 2,
    square_meters: 120,
    description: "Bright and modern apartment",
    amenities: ["Pool"],
  },
};

describe("PublicPropertyExplorer", () => {
  it("renders a public, pseudonymous state for a unit", async () => {
    getListingByIdMock.mockResolvedValue(listing as any);

    const router = createMemoryRouter(
      [
        {
          path: "/explorer/unit/:id",
          element: <PublicPropertyExplorer />,
        },
      ],
      {
        initialEntries: ["/explorer/unit/listing-1"],
      }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(screen.getByText(/BaytMiftah Property Explorer/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Unit: BM-UNIT-/i)).toBeInTheDocument();
    expect(screen.getByText(/Property: Example Heights/i)).toBeInTheDocument();
    expect(screen.getByText(/Buyer Public ID:/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified identity/i)).toBeInTheDocument();
  });
});
