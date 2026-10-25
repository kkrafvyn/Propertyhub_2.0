import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PropertyDetail } from "./PropertyDetail";
import { useAuth } from "../context/AuthContext";
import { renderWithProviders } from "../../test/render";
import { listingService } from "../../lib/listing.service";
import { geointelligenceService } from "../../lib/geointelligence.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { messageService } from "../../lib/message.service";
import { organizationService } from "../../lib/organization.service";
import { communicationService } from "../../lib/communication.service";
import { trustCenterService } from "../../lib/trust-center.service";
import { hostSettingsService } from "../../lib/host-settings.service";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useMyKyc", () => ({
  useMyKyc: () => ({ kyc: null, loading: false }),
}));

vi.mock("../context/PlatformFeaturesContext", () => ({
  usePlatformFeatures: () => ({
    flags: { whatsapp: true, voiceCalls: true, videoCalls: true, aiAssistant: true },
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock("../components/Navbar", () => ({
  Navbar: () => <div>Navbar</div>,
}));

vi.mock("../components/baytmiftah/ListingReviews", () => ({
  default: () => <div>Listing reviews</div>,
}));

vi.mock("../../lib/listing.service", () => ({
  listingService: {
    getListingById: vi.fn(),
    getPublicListings: vi.fn(),
    getSimilarListings: vi.fn(),
  },
}));

vi.mock("../../lib/geointelligence.service", () => ({
  geointelligenceService: {
    getNearbyServices: vi.fn(),
  },
}));

vi.mock("../../lib/savedproperty.service", () => ({
  savedPropertyService: {
    isPropertySaved: vi.fn(),
    toggleSavedProperty: vi.fn(),
  },
}));

vi.mock("../../lib/dealcase.service", () => ({
  dealCaseService: {
    createDealCase: vi.fn(),
  },
}));

vi.mock("../../lib/message.service", () => ({
  messageService: {
    createOrGetOrganizationConversation: vi.fn(),
    sendMessage: vi.fn(),
  },
}));

vi.mock("../../lib/organization.service", () => ({
  organizationService: {
    getOrganizationById: vi.fn(),
  },
}));

vi.mock("../../lib/communication.service", () => ({
  communicationService: {
    createInAppNotification: vi.fn(),
  },
}));

vi.mock("../../lib/trust-center.service", () => ({
  trustCenterService: {
    getListingTrustSnapshot: vi.fn(),
    getConsumerTrustBadges: vi.fn(),
  },
}));

vi.mock("../../lib/host-settings.service", () => ({
  hostSettingsService: {
    getListingSettings: vi.fn(),
  },
}));

vi.mock("../../lib/recently-viewed", () => ({
  trackRecentlyViewed: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const getListingByIdMock = vi.mocked(listingService.getListingById);
const getSimilarListingsMock = vi.mocked(listingService.getSimilarListings);
const getNearbyServicesMock = vi.mocked(geointelligenceService.getNearbyServices);
const isPropertySavedMock = vi.mocked(savedPropertyService.isPropertySaved);
const createDealCaseMock = vi.mocked(dealCaseService.createDealCase);
const createOrGetOrganizationConversationMock = vi.mocked(
  messageService.createOrGetOrganizationConversation
);
const sendMessageMock = vi.mocked(messageService.sendMessage);
const getOrganizationByIdMock = vi.mocked(organizationService.getOrganizationById);
const createInAppNotificationMock = vi.mocked(communicationService.createInAppNotification);
const getListingTrustSnapshotMock = vi.mocked(trustCenterService.getListingTrustSnapshot);
const getConsumerTrustBadgesMock = vi.mocked(trustCenterService.getConsumerTrustBadges);

const listing = {
  id: "listing-1",
  organization_id: "org-1",
  listing_type: "rental",
  price: 4200,
  currency: "GHS",
  status: "listed",
  visibility: "public",
  featured: false,
  published_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  organization: {
    name: "Prime Properties",
    logo_url: null,
    verified: true,
    email: "hello@primeproperties.com",
    phone: "+233200000000",
  },
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

function renderPropertyDetail() {
  const router = createMemoryRouter(
    [
      {
        path: "/property/:id",
        element: <PropertyDetail />,
      },
    ],
    {
      initialEntries: ["/property/listing-1"],
    }
  );

  renderWithProviders(<RouterProvider router={router} />);
}

describe("PropertyDetail inquiry flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getListingTrustSnapshotMock.mockResolvedValue(null as any);
    getConsumerTrustBadgesMock.mockResolvedValue([]);
    createInAppNotificationMock.mockResolvedValue({} as any);
  });

  it(
    "creates a deal case and shared inbox conversation from an inquiry",
    async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "lead-1",
        email: "lead@example.com",
        user_metadata: {
          full_name: "Jane Prospect",
        },
      },
      loading: false,
      error: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
    } as any);

    getListingByIdMock.mockResolvedValue(listing as any);
    getSimilarListingsMock.mockResolvedValue([]);
    getNearbyServicesMock.mockResolvedValue([]);
    isPropertySavedMock.mockResolvedValue(false);
    createDealCaseMock.mockResolvedValue({ id: "case-1" } as any);
    getOrganizationByIdMock.mockResolvedValue({
      id: "org-1",
      owner_id: "owner-1",
    } as any);
    createOrGetOrganizationConversationMock.mockResolvedValue({
      id: "shared-1",
      conversation_id: "conversation-1",
    } as any);
    sendMessageMock.mockResolvedValue({} as any);

    renderPropertyDetail();

    expect(await screen.findByText("5 Independence Ave, Accra")).toBeInTheDocument();

    const user = userEvent.setup();
    const startButtons = await screen.findAllByRole("button", { name: /check availability/i });
    await user.click(startButtons[0]);

    const messageField = await screen.findByPlaceholderText(
      "I'm interested in this property and would like more details."
    );
    expect(messageField).toHaveValue("Hi, is this property still available? Please confirm availability and the next viewing times.");
    await user.clear(messageField);
    await user.type(messageField, "I would like to schedule a viewing this weekend.");
    await user.click(screen.getByRole("button", { name: /send inquiry/i }));

    await waitFor(() => {
      expect(createDealCaseMock).toHaveBeenCalledWith(
        expect.objectContaining({
          listing_id: "listing-1",
          user_id: "lead-1",
          organization_id: "org-1",
        })
      );
    });

    expect(createOrGetOrganizationConversationMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      leadUserId: "lead-1",
      internalParticipantId: "owner-1",
      createdBy: "lead-1",
      dealCaseId: "case-1",
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      "conversation-1",
      "lead-1",
      expect.stringContaining("New inquiry about 5 Independence Ave, Accra")
    );
  },
  20000,
);
});
