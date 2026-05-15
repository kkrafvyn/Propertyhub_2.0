import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Projects } from "./Projects";
import { publicDiscoveryService } from "../../lib/public-discovery.service";

vi.mock("../components/Navbar", () => ({
  Navbar: () => <div>Navbar</div>,
}));

vi.mock("../../lib/public-discovery.service", async () => {
  const actual = await vi.importActual<typeof import("../../lib/public-discovery.service")>(
    "../../lib/public-discovery.service"
  );

  return {
    ...actual,
    publicDiscoveryService: {
      ...actual.publicDiscoveryService,
      getProjectCollections: vi.fn(),
    },
  };
});

const getProjectCollectionsMock = vi.mocked(publicDiscoveryService.getProjectCollections);

describe("Projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows project reputation with direct agency navigation", async () => {
    getProjectCollectionsMock.mockResolvedValue([
      {
        slug: "east-legon-development",
        title: "East Legon Development",
        summary: "2 active sale opportunities in East Legon.",
        organizationId: "org-1",
        organizationName: "Prime Estates",
        organizationSlug: "prime-estates",
        city: "Accra",
        region: "Greater Accra",
        neighborhood: "East Legon",
        listingType: "sale",
        listingCount: 2,
        availableUnits: 2,
        startingPrice: 1100000,
        averagePrice: 1140000,
        bedroomMix: ["3-bed"],
        amenityHighlights: ["Parking", "Pool"],
        trustHighlights: ["Verified operator", "Average trust 88/100", "very high demand"],
        heroImage: "https://example.com/project.jpg",
        listings: [],
      },
    ] as any);

    render(
      <MemoryRouter>
        <Projects />
      </MemoryRouter>
    );

    expect(await screen.findByText("East Legon Development")).toBeInTheDocument();
    expect(screen.getByText("Reputation")).toBeInTheDocument();
    expect(screen.getByText(/\/100 reputation/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open agency/i })).toHaveAttribute(
      "href",
      "/agencies/prime-estates"
    );
    expect(screen.getByRole("link", { name: /open collection/i })).toHaveAttribute(
      "href",
      "/projects/east-legon-development"
    );
  });
});
