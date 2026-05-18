import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { PropertyDetail } from "./PropertyDetail";
import { useAuth } from "../context/AuthContext";
import { listingService } from "../../lib/listing.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { messageService } from "../../lib/message.service";
import { organizationService } from "../../lib/organization.service";
import { communicationService } from "../../lib/communication.service";
import { trackReferralDealCaseCreated } from "../../lib/referral-attribution.service";
import { trustCenterService } from "../../lib/trust-center.service";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../components/Navbar", () => ({
  Navbar: () => <div>Navbar</div>,
}));

vi.mock("../../lib/listing.service", () => ({
  listingService: {
    getListingById: vi.fn(),
    getPublicListings: vi.fn(),
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
  },
}));

vi.mock("../../lib/referral-attribution.service", () => ({
  appendReferralMetadata: vi.fn((message: string) => `${message}\n\n<!-- referral -->`),
  trackReferralDealCaseCreated: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const getListingByIdMock = vi.mocked(listingService.getListingById);
const getPublicListingsMock = vi.mocked(listingService.getPublicListings);
const isPropertySavedMock = vi.mocked(savedPropertyService.isPropertySaved);
const createDealCaseMock = vi.mocked(dealCaseService.createDealCase);
const createOrGetOrganizationConversationMock = vi.mocked(
  messageService.createOrGetOrganizationConversation
);
const sendMessageMock = vi.mocked(messageService.sendMessage);
const getOrganizationByIdMock = vi.mocked(organizationService.getOrganizationById);
const createInAppNotificationMock = vi.mocked(communicationService.createInAppNotification);
const trackReferralDealCaseCreatedMock = vi.mocked(trackReferralDealCaseCreated);
const getListingTrustSnapshotMock = vi.mocked(trustCenterService.getListingTrustSnapshot);

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
      initialEntries: ["/property/listing-1?ref=user-99&channel=diaspora"],
    }
  );

  render(<RouterProvider router={router} />);
}

describe("PropertyDetail inquiry flow", () => {
  it("creates a deal case and shared inbox conversation from an inquiry", async () => {
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
    getPublicListingsMock.mockResolvedValue([]);
    isPropertySavedMock.mockResolvedValue(false);
    getListingTrustSnapshotMock.mockResolvedValue({
      organizationVerified: true,
      publicDocumentCount: 0,
      publicDocuments: [],
      signedDocumentCount: 0,
      securePaymentsEnabled: true,
      receiptIntegrityEnabled: true,
      trustHighlights: [],
    } as any);
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
    createInAppNotificationMock.mockResolvedValue({} as any);

    renderPropertyDetail();

    expect(await screen.findByText("5 Independence Ave, Accra")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /start inquiry/i }));
    await user.type(
      screen.getByPlaceholderText("I'm interested in this property and would like more details."),
      "I would like to schedule a viewing this weekend."
    );
    await user.click(screen.getByRole("button", { name: /send inquiry/i }));

    await waitFor(() => {
    expect(createDealCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        listing_id: "listing-1",
        user_id: "lead-1",
        organization_id: "org-1",
        message: expect.stringContaining("<!-- referral -->"),
      })
    );

    expect(trackReferralDealCaseCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: "user-99",
        channel: "diaspora",
      }),
      expect.objectContaining({
        dealCaseId: "case-1",
        source: "property-detail-inquiry",
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
  }, 20000);

  it("submits a purchase offer into the negotiation pipeline", async () => {
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

    getListingByIdMock.mockResolvedValue({
      ...listing,
      listing_type: "sale",
      price: 1250000,
    } as any);
    getPublicListingsMock.mockResolvedValue([]);
    isPropertySavedMock.mockResolvedValue(false);
    getListingTrustSnapshotMock.mockResolvedValue({
      organizationVerified: true,
      publicDocumentCount: 0,
      publicDocuments: [],
      signedDocumentCount: 0,
      securePaymentsEnabled: true,
      receiptIntegrityEnabled: true,
      trustHighlights: [],
    } as any);
    createDealCaseMock.mockResolvedValue({ id: "offer-case-1" } as any);
    getOrganizationByIdMock.mockResolvedValue({
      id: "org-1",
      owner_id: "owner-1",
    } as any);
    createOrGetOrganizationConversationMock.mockResolvedValue({
      id: "shared-2",
      conversation_id: "conversation-2",
    } as any);
    sendMessageMock.mockResolvedValue({} as any);
    createInAppNotificationMock.mockResolvedValue({} as any);

    renderPropertyDetail();

    expect(await screen.findByText("5 Independence Ave, Accra")).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /make offer/i }));
    await user.clear(screen.getByLabelText("Offer Amount (GHS)"));
    await user.type(screen.getByLabelText("Offer Amount (GHS)"), "1200000");
    await user.type(screen.getByLabelText("Phone"), "+233240000000");
    await user.type(
      screen.getByPlaceholderText(
        "Share any contingencies, document expectations, or payment structure notes."
      ),
      "Ready to move quickly after title verification."
    );
    await user.click(screen.getByRole("button", { name: /submit offer/i }));

    await waitFor(() => {
    expect(createDealCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        listing_id: "listing-1",
        organization_id: "org-1",
        case_type: "purchase_offer",
        pipeline_stage: "negotiation",
        priority: "medium",
        message: expect.stringContaining("<!-- referral -->"),
      })
    );

    expect(trackReferralDealCaseCreatedMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: "user-99",
        channel: "diaspora",
      }),
      expect.objectContaining({
        dealCaseId: "offer-case-1",
        source: "property-detail-offer",
      })
    );
    });

    expect(createOrGetOrganizationConversationMock).toHaveBeenCalledWith({
      organizationId: "org-1",
      leadUserId: "lead-1",
      internalParticipantId: "owner-1",
      createdBy: "lead-1",
      dealCaseId: "offer-case-1",
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      "conversation-2",
      "lead-1",
      expect.stringContaining("Offer submitted for 5 Independence Ave, Accra")
    );
  }, 20000);
});
