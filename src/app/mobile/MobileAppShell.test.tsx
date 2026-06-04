import { render, screen, waitFor, within } from "@testing-library/react";
import { type ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileAppShell } from "./MobileAppShell";
import { AppThemeProvider } from "../context/AppThemeContext";
import { useAuth } from "../context/AuthContext";
import { listingService } from "../../lib/listing.service";
import { organizationService } from "../../lib/organization.service";
import { savedPropertyService } from "../../lib/savedproperty.service";
import { dealCaseService } from "../../lib/dealcase.service";
import { messageService } from "../../lib/message.service";
import { propertyViewingService } from "../../lib/property-viewing.service";
import { paymentService } from "../../lib/payment.service";
import { savedSearchAlertService } from "../../lib/saved-search-alert.service";
import { communicationService } from "../../lib/communication.service";
import { mobileMediaService } from "../../lib/mobile-media.service";
import { mobileNativeService } from "../../lib/mobile-native.service";
import { mobileOnboardingService } from "../../lib/mobile-onboarding.service";
import { mobileOfflineQueueService } from "../../lib/mobile-offline-queue.service";
import { pushNotificationService } from "../../lib/push-notification.service";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/listing.service", () => ({
  listingService: {
    getPublicListings: vi.fn(),
  },
}));

vi.mock("../../lib/organization.service", () => ({
  organizationService: {
    getVerifiedOrganizations: vi.fn(),
    getUserOrganizations: vi.fn(),
  },
}));

vi.mock("../../lib/savedproperty.service", () => ({
  savedPropertyService: {
    getSavedProperties: vi.fn(),
  },
}));

vi.mock("../../lib/dealcase.service", () => ({
  dealCaseService: {
    getDealCasesByUser: vi.fn(),
  },
}));

vi.mock("../../lib/message.service", () => ({
  messageService: {
    getUserConversations: vi.fn(),
  },
}));

vi.mock("../../lib/property-viewing.service", () => ({
  propertyViewingService: {
    getUserViewings: vi.fn(),
  },
}));

vi.mock("../../lib/payment.service", () => ({
  paymentService: {
    getUserPropertyTransactions: vi.fn(),
  },
}));

vi.mock("../../lib/saved-search-alert.service", () => ({
  savedSearchAlertService: {
    getUserAlerts: vi.fn(),
  },
}));

vi.mock("../../lib/communication.service", () => ({
  communicationService: {
    getUnreadCount: vi.fn(),
    getNotificationHistory: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

vi.mock("../../lib/property-media", () => ({
  getPropertyCoverImage: vi.fn(() => "https://example.com/property.jpg"),
}));

vi.mock("../../lib/mobile-native.service", () => ({
  mobileNativeService: {
    impact: vi.fn(),
    isNative: vi.fn(() => false),
    registerNativePush: vi.fn(),
    watchPushOpens: vi.fn(async () => vi.fn()),
  },
}));

vi.mock("../../lib/mobile-onboarding.service", () => ({
  mobileOnboardingService: {
    complete: vi.fn(async () => ({
      version: "2026-05-16",
      completedAt: "2026-05-16T00:00:00.000Z",
      acceptedLegalAt: "2026-05-16T00:00:00.000Z",
      acceptedItems: [],
    })),
    getStatus: vi.fn(async () => ({ completed: true, record: null })),
    reset: vi.fn(),
  },
}));

vi.mock("../../lib/mobile-media.service", () => ({
  mobileMediaService: {
    capturePropertyPhoto: vi.fn(),
    photoToFile: vi.fn(),
  },
}));

vi.mock("../../lib/mobile-offline-queue.service", () => ({
  mobileOfflineQueueService: {
    count: vi.fn(async () => 0),
    enqueue: vi.fn(),
    list: vi.fn(async () => []),
    remove: vi.fn(),
    clear: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock("../../lib/push-notification.service", () => ({
  pushNotificationService: {
    registerPush: vi.fn(async () => ({ status: "registered" })),
  },
}));

const useAuthMock = vi.mocked(useAuth);
const getPublicListingsMock = vi.mocked(listingService.getPublicListings);
const getVerifiedOrganizationsMock = vi.mocked(organizationService.getVerifiedOrganizations);
const getUserOrganizationsMock = vi.mocked(organizationService.getUserOrganizations);
const getSavedPropertiesMock = vi.mocked(savedPropertyService.getSavedProperties);
const getDealCasesByUserMock = vi.mocked(dealCaseService.getDealCasesByUser);
const getUserConversationsMock = vi.mocked(messageService.getUserConversations);
const getUserViewingsMock = vi.mocked(propertyViewingService.getUserViewings);
const getUserPropertyTransactionsMock = vi.mocked(paymentService.getUserPropertyTransactions);
const getUserAlertsMock = vi.mocked(savedSearchAlertService.getUserAlerts);
const getUnreadCountMock = vi.mocked(communicationService.getUnreadCount);
const getNotificationHistoryMock = vi.mocked(communicationService.getNotificationHistory);
const isNativeMock = vi.mocked(mobileNativeService.isNative);
const getOnboardingStatusMock = vi.mocked(mobileOnboardingService.getStatus);
const completeOnboardingMock = vi.mocked(mobileOnboardingService.complete);
const capturePropertyPhotoMock = vi.mocked(mobileMediaService.capturePropertyPhoto);
const enqueueOfflineMock = vi.mocked(mobileOfflineQueueService.enqueue);
const countOfflineQueueMock = vi.mocked(mobileOfflineQueueService.count);
const registerPushMock = vi.mocked(pushNotificationService.registerPush);

function createAuthState(overrides: Record<string, unknown> = {}) {
  return {
    user: null,
    loading: false,
    error: null,
    authAssurance: {
      currentLevel: null,
      nextLevel: null,
      loading: false,
    },
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    refreshAuthAssurance: vi.fn(),
    listMfaFactors: vi.fn(),
    challengeMfaFactor: vi.fn(),
    verifyMfaFactor: vi.fn(),
    ...overrides,
  };
}

function createSignedInAuthState(overrides: Record<string, unknown> = {}) {
  return createAuthState({
    user: {
      id: "user-1",
      email: "buyer@example.com",
      user_metadata: {
        full_name: "Ama Buyer",
      },
    },
    ...overrides,
  });
}

function primePublicMocks() {
  getPublicListingsMock.mockResolvedValue([
    {
      id: "listing-1",
      listing_type: "rental",
      price: 8500,
      currency: "GHS",
      quality_score: 88,
      organization: {
        verified: true,
      },
      property: {
        address: "Airport Residential Apartment",
        city: "Accra",
        region: "Greater Accra",
        neighborhood: "Airport Residential",
        bedrooms: 2,
      },
    },
  ] as any);

  getVerifiedOrganizationsMock.mockResolvedValue([
    {
      id: "org-1",
      name: "Prime Estates",
      slug: "prime-estates",
      logo_url: "https://example.com/logo.png",
    },
  ] as any);
}

function renderMobileShell(initialEntry = "/", children?: ReactNode) {
  return render(
    <AppThemeProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <MobileAppShell>{children}</MobileAppShell>
      </MemoryRouter>
    </AppThemeProvider>
  );
}

describe("MobileAppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primePublicMocks();
    getUserOrganizationsMock.mockResolvedValue([]);
    getSavedPropertiesMock.mockResolvedValue([]);
    getDealCasesByUserMock.mockResolvedValue([]);
    getUserConversationsMock.mockResolvedValue([]);
    getUserViewingsMock.mockResolvedValue([]);
    getUserPropertyTransactionsMock.mockResolvedValue([]);
    getUserAlertsMock.mockResolvedValue([]);
    getUnreadCountMock.mockResolvedValue(0);
    getNotificationHistoryMock.mockResolvedValue([]);
    isNativeMock.mockReturnValue(false);
    getOnboardingStatusMock.mockResolvedValue({ completed: true, record: null });
    completeOnboardingMock.mockClear();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-app-theme");
    document.documentElement.removeAttribute("data-app-theme-preference");
    document.documentElement.classList.remove("dark");
    countOfflineQueueMock.mockResolvedValue(0);
    enqueueOfflineMock.mockResolvedValue({ id: "queue-1" } as any);
    capturePropertyPhotoMock.mockResolvedValue({
      id: "photo-1",
      webPath: "https://example.com/photo.jpg",
      capturedAt: "2026-05-15T09:00:00.000Z",
    });
    registerPushMock.mockResolvedValue({ status: "registered" } as any);
  });

  it("does not show the launch splash in the web mobile shell", () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);
    isNativeMock.mockReturnValue(false);

    renderMobileShell();

    expect(screen.queryByLabelText(/BaytMiftah is opening/i)).not.toBeInTheDocument();
  });

  it("does not show the launch splash in the native mobile shell", () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);
    isNativeMock.mockReturnValue(true);

    renderMobileShell();

    expect(screen.queryByLabelText(/BaytMiftah is opening/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Securely entering portal...")).not.toBeInTheDocument();
  });

  it("shows native first-run onboarding with legal acceptance before the app", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "user-1",
          email: "buyer@example.com",
          user_metadata: {
            full_name: "Ama Buyer",
          },
        },
      }) as any
    );
    isNativeMock.mockReturnValue(true);
    getOnboardingStatusMock.mockResolvedValue({ completed: false, record: null });

    renderMobileShell();
    const user = userEvent.setup();
    const dialog = await screen.findByRole("dialog", { name: /start with confidence/i });

    expect(within(dialog).getByText("Turn on alerts")).toBeInTheDocument();
    expect(within(dialog).getByText("Send drafts")).toBeInTheDocument();
    expect(within(dialog).getByText("Buying guide")).toBeInTheDocument();
    expect(within(dialog).getByText("Get help")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: /terms of use/i })).toHaveAttribute(
      "href",
      "/legal/terms"
    );
    expect(within(dialog).getByRole("link", { name: /privacy notice/i })).toHaveAttribute(
      "href",
      "/legal/privacy"
    );

    await user.click(within(dialog).getByRole("button", { name: /i agree and continue/i }));

    expect(completeOnboardingMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        "terms-of-use",
        "privacy-notice",
        "push-alerts-disclosure",
        "offline-drafts-disclosure",
      ])
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /start with confidence/i })).not.toBeInTheDocument();
    });
  });

  it("organizes public discovery pages into the relevant mobile tabs", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell();
    const user = userEvent.setup();
    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });

    expect(await screen.findByText("Verified Property")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search by location, property, or agent")).not.toBeInTheDocument();
    expect(screen.getByText("Verified Property")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore property/i })).toHaveAttribute(
      "href",
      "/property/listing-1"
    );
    expect(screen.getByRole("heading", { name: /property categories/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /verified agents/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /verified agencies/i })).toBeInTheDocument();
    expect(screen.getByText("Fraud Protection")).toBeInTheDocument();
    expect(screen.queryByText(/fresh listings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/continue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quick paths/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /projects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /public reviews/i })).not.toBeInTheDocument();
    expect(within(tabBar).getByRole("link", { name: /^explore$/i })).toHaveAttribute("href", "/");

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));

    expect(screen.queryByRole("link", { name: /home valuation/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /my listings/i })).toHaveAttribute(
      "href",
      "/workspace?next=listings"
    );
  });

  it("surfaces messages, saved, and workspace tools for signed-in users", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "user-1",
          email: "agent@example.com",
          user_metadata: {
            full_name: "Afi Mensah",
          },
        },
      }) as any
    );

    getUserOrganizationsMock.mockResolvedValue([
      {
        organization: {
          id: "org-1",
          name: "Prime Estates",
          slug: "prime-estates",
        },
      },
    ] as any);
    getDealCasesByUserMock.mockResolvedValue([{ id: "deal-1", pipeline_stage: "negotiation" }] as any);
    getUserConversationsMock.mockResolvedValue([
      {
        id: "conversation-1",
        organization: {
          name: "Prime Estates",
        },
        messages: [{ content: "Viewing confirmed for tomorrow." }],
        updated_at: "2026-05-15T08:00:00.000Z",
      },
    ] as any);
    getUserViewingsMock.mockResolvedValue([
      {
        id: "viewing-1",
        confirmed_datetime: "2026-05-16T13:00:00.000Z",
        listing: {
          property: {
            address: "Cantonments Townhome",
          },
        },
        organization: {
          name: "Prime Estates",
        },
      },
    ] as any);
    getUserPropertyTransactionsMock.mockResolvedValue([{ id: "payment-1" }] as any);
    getUserAlertsMock.mockResolvedValue([{ id: "alert-1" }] as any);
    getUnreadCountMock.mockResolvedValue(1);
    getNotificationHistoryMock.mockResolvedValue([
      {
        id: "notification-1",
        subject: "Viewing update",
        content: "Your viewing was confirmed.",
        read: false,
        created_at: "2026-05-15T08:30:00.000Z",
        action_url: "/app/viewings",
      },
    ] as any);
    getSavedPropertiesMock.mockResolvedValue([
      {
        id: "saved-1",
        listing: {
          id: "listing-2",
          listing_type: "sale",
          price: 1200000,
          currency: "GHS",
          quality_score: 91,
          organization: {
            verified: true,
          },
          property: {
            address: "Cantonments Townhome",
            city: "Accra",
            region: "Greater Accra",
            neighborhood: "Cantonments",
            bedrooms: 3,
          },
        },
      },
    ] as any);

    renderMobileShell();
    const user = userEvent.setup();
    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });

    await screen.findByText("Verified Property");

    expect(await within(tabBar).findByText("4")).toBeInTheDocument();
    expect(within(tabBar).getByText("2")).toBeInTheDocument();
    expect(within(tabBar).getByText("1")).toBeInTheDocument();

    await user.click(within(tabBar).getByRole("link", { name: /^messages$/i }));
    expect(await screen.findByText("Julian Sterling")).toBeInTheDocument();
    expect(screen.getByText("The Glass House • Malibu")).toBeInTheDocument();
    expect(screen.queryByText(/activity shortcuts/i)).not.toBeInTheDocument();

    await user.click(within(tabBar).getByRole("link", { name: /^saved$/i }));
    expect(screen.getAllByRole("link", { name: /compare saved listings/i })[0]).toHaveAttribute(
      "href",
      "/app/compare"
    );
    expect(screen.queryByRole("link", { name: /buying guide/i })).not.toBeInTheDocument();

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));
    expect(screen.queryByRole("link", { name: /referrals/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /support/i })).toHaveAttribute("href", "/app/support");
    expect(screen.getByRole("link", { name: /my listings/i })).toHaveAttribute(
      "href",
      "/workspace?next=listings"
    );
    expect(screen.getByRole("link", { name: /scheduled tours/i })).toHaveAttribute("href", "/app/viewings");
    expect(screen.getByRole("link", { name: /documents/i })).toHaveAttribute("href", "/app/documents");
  });

  it("renders the focused profile groups without field-kit controls", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "user-1",
          email: "agent@example.com",
          user_metadata: {
            full_name: "Afi Mensah",
          },
        },
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        organization: {
          id: "org-1",
          name: "Prime Estates",
          slug: "prime-estates",
        },
      },
    ] as any);

    renderMobileShell();
    const user = userEvent.setup();
    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));
    expect(await screen.findByText("Account settings")).toBeInTheDocument();
    expect(screen.getByText("Property management")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /aureus ui/i })).toBeInTheDocument();
    expect(screen.queryByText("Field kit")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add photos/i })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/quick note from a viewing/i)).not.toBeInTheDocument();
  });

  it("keeps field tools out of the buyer account view without a workspace", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "buyer-1",
          email: "buyer@example.com",
          user_metadata: {
            full_name: "Ama Buyer",
          },
        },
      }) as any
    );

    renderMobileShell();
    const user = userEvent.setup();
    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));

    expect(await screen.findByText("Help Center")).toBeInTheDocument();
    expect(screen.queryByText("Field kit")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add photos/i })).not.toBeInTheDocument();
  });

  it("only shows the bottom navigation for signed-in mobile users", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);

    renderMobileShell();

    await screen.findByText("Verified Property");
    expect(screen.queryByPlaceholderText("Search by location, property, or agent")).not.toBeInTheDocument();
    await waitFor(() => expect(countOfflineQueueMock).toHaveBeenCalled());
    expect(
      screen.queryByRole("navigation", { name: /primary mobile navigation/i })
    ).not.toBeInTheDocument();
  });

  it("keeps signed-in users on the Aureus app palette", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell();
    const user = userEvent.setup();
    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));
    await user.click(await screen.findByRole("switch", { name: /aureus ui/i }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-app-theme", "aureus");
    });
    expect(document.documentElement).toHaveAttribute("data-app-theme-preference", "baytmiftah");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(screen.getByRole("switch", { name: /aureus ui/i })).toHaveAttribute("aria-checked", "false");
  });

  it("wires the settings sign out action to auth logout", async () => {
    const signOut = vi.fn(async () => undefined);
    useAuthMock.mockReturnValue(createSignedInAuthState({ signOut }) as any);

    renderMobileShell();
    const user = userEvent.setup();
    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));
    await user.click(await screen.findByRole("button", { name: /^logout/i }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("keeps the premium home free of top search controls while explore owns the bottom nav", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell();

    expect(await screen.findByText("Verified Property")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search by location, property, or agent")).not.toBeInTheDocument();
    expect(screen.queryByText("Find the right fit")).not.toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    expect(within(tabBar).getByRole("link", { name: /^explore$/i })).toHaveAttribute("href", "/");
  });

  it("wraps direct mobile routes inside the shared app frame", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/search", <div>Search route body</div>);

    expect(await screen.findByRole("heading", { name: /exclusive residences/i })).toBeInTheDocument();
    expect(screen.getByText("The Obsidian Pavilion")).toBeInTheDocument();
    expect(screen.getByText("Show Map")).toBeInTheDocument();
    expect(screen.queryByText("Search route body")).not.toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    expect(within(tabBar).getByRole("link", { name: /^explore$/i })).toHaveAttribute("aria-current", "page");
  });

  it("renders the custom mobile area guide experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/guides/bel-air-crest", <div>Area guide route body</div>);

    expect(await screen.findByRole("heading", { name: /bel air crest/i })).toBeInTheDocument();
    expect(screen.getByText("Neighborhood Essence")).toBeInTheDocument();
    expect(screen.getByText("The Atmosphere")).toBeInTheDocument();
    expect(screen.getByText("Curated Local Gems")).toBeInTheDocument();
    expect(screen.getByText("The Obsidian Lounge")).toBeInTheDocument();
    expect(screen.queryByText("Area guide route body")).not.toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    expect(within(tabBar).getByRole("link", { name: /^explore$/i })).toHaveAttribute("aria-current", "page");
  });

  it("renders the custom mobile privacy policy experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/legal/privacy", <div>Privacy route body</div>);

    expect(await screen.findByRole("heading", { name: /privacy policy & data protection/i }))
      .toBeInTheDocument();
    expect(screen.getByText("1. Collection of Information")).toBeInTheDocument();
    expect(screen.getByText("2. Information Usage")).toBeInTheDocument();
    expect(screen.getByText("3. Your Global Rights")).toBeInTheDocument();
    expect(screen.getByText("4. Security Protocols")).toBeInTheDocument();
    expect(screen.getByText("Privacy Concierge")).toBeInTheDocument();
    expect(screen.queryByText("Privacy route body")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /primary mobile navigation/i })).not.toBeInTheDocument();
  });

  it("renders the custom mobile home valuation experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/valuation", <div>Valuation route body</div>);

    expect(await screen.findByRole("heading", { name: /discover your property's/i }))
      .toBeInTheDocument();
    expect(screen.getByText("AI-Powered Analysis")).toBeInTheDocument();
    expect(screen.getByText("99.2% Accuracy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /calculate estimate/i })).toBeInTheDocument();
    expect(screen.getByText("Comparable High-Value Estates")).toBeInTheDocument();
    expect(screen.getByText("Bel-Air Crest Manor")).toBeInTheDocument();
    expect(screen.queryByText("Valuation route body")).not.toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    expect(within(tabBar).getByRole("link", { name: /^valuation$/i })).toHaveAttribute("aria-current", "page");
  });

  it("renders the custom mobile sold ledger experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/sold-ledger", <div>Sold ledger route body</div>);

    expect(await screen.findByText("Obsidian Estate")).toBeInTheDocument();
    expect(await screen.findByText("Sold Ledger")).toBeInTheDocument();
    expect(screen.getByText("Average Premium")).toBeInTheDocument();
    expect(screen.getByText("Mayfair & Belgravia")).toBeInTheDocument();
    expect(screen.getByText("Chelsea Waterfront")).toBeInTheDocument();
    expect(screen.getByText("Recent Acquisitions")).toBeInTheDocument();
    expect(screen.getByText("The Obsidian Penthouse")).toBeInTheDocument();
    expect(screen.getByText("£14,250,000")).toBeInTheDocument();
    expect(screen.queryByText("Sold ledger route body")).not.toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    expect(within(tabBar).getByRole("link", { name: /^explore$/i })).toHaveAttribute("aria-current", "page");
  });

  it("renders the custom mobile public verification receipt", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/verify/OE-7729-BF-2024", <div>Verification receipt route body</div>);

    expect(await screen.findByText("Authenticity Certificate")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /verification receipt/i })).toBeInTheDocument();
    expect(screen.getByText("ID: OE-7729-BF-2024")).toBeInTheDocument();
    expect(screen.getByText("Authenticity Verified")).toBeInTheDocument();
    expect(screen.getByText("The Obsidian Penthouse")).toBeInTheDocument();
    expect(screen.getByText("99.8%")).toBeInTheDocument();
    expect(screen.getByText("Primary Asset View")).toBeInTheDocument();
    expect(screen.queryByText("Verification receipt route body")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /primary mobile navigation/i })).not.toBeInTheDocument();

    const verificationNav = screen.getByRole("navigation", { name: /public verification navigation/i });
    expect(within(verificationNav).getByRole("link", { name: /^profile$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile alerts experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/app/alerts", <div>Alerts route body</div>);

    expect(await screen.findByRole("heading", { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText("Intelligence Center")).toBeInTheDocument();
    expect(screen.getByText("Transaction Updates")).toBeInTheDocument();
    expect(screen.getByText("Escrow Milestone Reached")).toBeInTheDocument();
    expect(screen.getByText("Property Alerts")).toBeInTheDocument();
    expect(screen.getByText("Burj Khalifa Suite 104")).toBeInTheDocument();
    expect(screen.getByText("Security Alerts")).toBeInTheDocument();
    expect(screen.queryByText("Alerts route body")).not.toBeInTheDocument();

    const alertsNav = screen.getByRole("navigation", { name: /alerts navigation/i });
    expect(within(alertsNav).getByRole("link", { name: /^alerts$/i })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("navigation", { name: /primary mobile navigation/i })).not.toBeInTheDocument();
  });

  it("renders the custom mobile payments experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/app/payments", <div>Payments route body</div>);

    expect(await screen.findByRole("heading", { name: /financial overview/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /make payment/i })).toBeInTheDocument();
    expect(screen.getByText("Payment Methods")).toBeInTheDocument();
    expect(screen.getByText("Escrow Status")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Installments")).toBeInTheDocument();
    expect(screen.getByText("Payment History")).toBeInTheDocument();
    expect(screen.queryByText("Payments route body")).not.toBeInTheDocument();

    const investmentNav = screen.getByRole("navigation", { name: /investment navigation/i });
    expect(within(investmentNav).getByRole("link", { name: /^invest$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile buyer concierge experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/app/buying-tools", <div>Buying tools route body</div>);

    expect(await screen.findByRole("heading", { name: /buyer concierge/i })).toBeInTheDocument();
    expect(screen.getByText("Wealth Architect")).toBeInTheDocument();
    expect(screen.getByText("Global Exchange")).toBeInTheDocument();
    expect(screen.getByText("Request a Bespoke Valuation")).toBeInTheDocument();
    expect(screen.getByText("Buying Guide")).toBeInTheDocument();
    expect(screen.queryByText("Buying tools route body")).not.toBeInTheDocument();

    const buyerNav = screen.getByRole("navigation", { name: /buyer tools navigation/i });
    expect(within(buyerNav).getByRole("link", { name: /^leads$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile smart access experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/app/access", <div>Access route body</div>);

    expect(await screen.findByRole("heading", { name: /elite access portfolio/i })).toBeInTheDocument();
    expect(screen.getByText("Security Hub")).toBeInTheDocument();
    expect(screen.getByText("Villa Al-Majd")).toBeInTheDocument();
    expect(screen.getByText("Digital Keys")).toBeInTheDocument();
    expect(screen.getByText("Leila Ben-Youssef")).toBeInTheDocument();
    expect(screen.getByText("Security Log")).toBeInTheDocument();
    expect(screen.getByText("Entrance Door Unlocked")).toBeInTheDocument();
    expect(screen.queryByText("Access route body")).not.toBeInTheDocument();

    const accessNav = screen.getByRole("navigation", { name: /smart access navigation/i });
    expect(within(accessNav).getByRole("link", { name: /^listings$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile applications experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/app/applications", <div>Applications route body</div>);

    expect(await screen.findByRole("heading", { name: /my applications/i })).toBeInTheDocument();
    expect(screen.getByText("Active Applications")).toBeInTheDocument();
    expect(screen.getByText("In Escrow")).toBeInTheDocument();
    expect(screen.getByText("The Al-Barari Obsidian Villa")).toBeInTheDocument();
    expect(screen.getByText("One Hyde Park Penthouse")).toBeInTheDocument();
    expect(screen.getByText("Your KYC verification is complete")).toBeInTheDocument();
    expect(screen.queryByText("Applications route body")).not.toBeInTheDocument();

    const applicationsNav = screen.getByRole("navigation", { name: /applications navigation/i });
    expect(within(applicationsNav).getByRole("link", { name: /^listings$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("uses the applications status screen for mobile verification", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/app/verification", <div>Verification route body</div>);

    expect(await screen.findByRole("heading", { name: /my applications/i })).toBeInTheDocument();
    expect(screen.getByText("Your KYC verification is complete")).toBeInTheDocument();
    expect(screen.queryByText("Verification route body")).not.toBeInTheDocument();

    const verificationNav = screen.getByRole("navigation", { name: /applications navigation/i });
    expect(within(verificationNav).getByRole("link", { name: /^listings$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile priority support experience", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/app/support", <div>Support route body</div>);

    expect(await screen.findByRole("heading", { name: /priority support/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search the Luxury Protocol FAQ...")).toBeInTheDocument();
    expect(screen.getByText("Contact Personal Concierge")).toBeInTheDocument();
    expect(screen.getByText("Submit Technical Inquiry")).toBeInTheDocument();
    expect(screen.getByText("Luxury Protocol")).toBeInTheDocument();
    expect(screen.getByText("24/7")).toBeInTheDocument();
    expect(screen.queryByText("Support route body")).not.toBeInTheDocument();

    const supportNav = screen.getByRole("navigation", { name: /support navigation/i });
    expect(within(supportNav).getByRole("link", { name: /^support$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile settings experience", async () => {
    const { signOut } = createSignedInAuthState();
    useAuthMock.mockReturnValue({ ...createSignedInAuthState(), signOut } as any);
    const user = userEvent.setup();

    renderMobileShell("/app/settings", <div>Settings route body</div>);

    expect(await screen.findByText("Khalid Al-Mansour")).toBeInTheDocument();
    expect(screen.getByText("Security & Privacy")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /two-factor authentication/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByText("Biometrics")).toBeInTheDocument();
    expect(screen.getByText("FaceID Enabled")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Preferences")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.queryByText("Settings route body")).not.toBeInTheDocument();

    const settingsNav = screen.getByRole("navigation", { name: /settings navigation/i });
    expect(within(settingsNav).getByRole("link", { name: /^menu$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );

    await user.click(screen.getByRole("button", { name: /sign out of all devices/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("renders the custom mobile listing management experience", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "manager-1",
          email: "manager@baytmiftah.com",
          user_metadata: { full_name: "Manager One" },
        } as any,
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        id: "org-1",
        name: "Estate Elite",
        slug: "estate-elite",
        role: "owner",
      },
    ] as any);

    renderMobileShell("/workspace?next=listings", <div>Workspace listings route body</div>);

    expect(await screen.findByRole("heading", { name: /listing management/i })).toBeInTheDocument();
    expect(screen.getByText("Estate Elite")).toBeInTheDocument();
    expect(screen.getByText("Total Inventory")).toBeInTheDocument();
    expect(screen.getByText("Total Value")).toBeInTheDocument();
    expect(screen.getByText("Active Inquiries")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new listing/i })).toHaveAttribute(
      "href",
      "/workspace?next=new-listing"
    );
    expect(screen.getByText("The Obsidian Villa")).toBeInTheDocument();
    expect(screen.getByText("Skyline Penthouse")).toBeInTheDocument();
    expect(screen.getByText("Azure Retreat")).toBeInTheDocument();
    expect(screen.queryByText("Workspace listings route body")).not.toBeInTheDocument();

    const agencyNav = screen.getByRole("navigation", { name: /agency navigation/i });
    expect(within(agencyNav).getByRole("link", { name: /^properties$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile create listing experience", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "manager-1",
          email: "manager@baytmiftah.com",
          user_metadata: { full_name: "Manager One" },
        } as any,
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        id: "org-1",
        name: "Estate Elite",
        slug: "estate-elite",
        role: "owner",
      },
    ] as any);

    renderMobileShell("/workspace?next=new-listing", <div>Workspace new listing route body</div>);

    expect(await screen.findByRole("heading", { name: /create exclusive listing/i })).toBeInTheDocument();
    expect(screen.getByText("Estate Elite")).toBeInTheDocument();
    expect(screen.getByText("Basics")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Media")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /property essentials/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/listing title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/property type/i)).toHaveValue("Luxury Villa");
    expect(screen.getByLabelText(/price \(usd\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/year built/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confidential description/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
    expect(screen.queryByText("Workspace new listing route body")).not.toBeInTheDocument();

    const agencyNewListingNav = screen.getByRole("navigation", { name: /agency new listing navigation/i });
    expect(within(agencyNewListingNav).getByRole("link", { name: /^properties$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile lead CRM experience", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "manager-1",
          email: "manager@baytmiftah.com",
          user_metadata: { full_name: "Manager One" },
        } as any,
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        id: "org-1",
        name: "Estate Elite",
        slug: "estate-elite",
        role: "owner",
      },
    ] as any);

    renderMobileShell("/workspace?next=leads", <div>Workspace leads route body</div>);

    expect(await screen.findByRole("heading", { name: /client intelligence/i })).toBeInTheDocument();
    expect(screen.getByText("Estate Elite")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new lead/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filters/i })).toBeInTheDocument();
    expect(screen.getByText("Active Hot Leads")).toBeInTheDocument();
    expect(screen.getByText("Unread Messages")).toBeInTheDocument();
    expect(screen.getByText("Pipeline Value")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /priority queue/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search leads...")).toBeInTheDocument();
    expect(screen.getByText("Julian Vane")).toBeInTheDocument();
    expect(screen.getByText("Elena Rossi")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    expect(screen.getByText("AI Prospecting Insight")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate personalized email/i })).toBeInTheDocument();
    expect(screen.queryByText("Workspace leads route body")).not.toBeInTheDocument();

    const agencyLeadsNav = screen.getByRole("navigation", { name: /agency leads navigation/i });
    expect(within(agencyLeadsNav).getByRole("link", { name: /^leads$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile agency financial experience", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "manager-1",
          email: "manager@baytmiftah.com",
          user_metadata: { full_name: "Manager One" },
        } as any,
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        id: "org-1",
        name: "Estate Elite",
        slug: "estate-elite",
        role: "owner",
      },
    ] as any);

    renderMobileShell("/workspace?next=wealth", <div>Workspace wealth route body</div>);

    expect(await screen.findByRole("heading", { name: /wealth management/i })).toBeInTheDocument();
    expect(screen.getByText("Estate Elite")).toBeInTheDocument();
    expect(screen.getByText("Commission Earned YTD")).toBeInTheDocument();
    expect(screen.getByText("$2,410,500.00")).toBeInTheDocument();
    expect(screen.getByText("Revenue Forecast")).toBeInTheDocument();
    expect(screen.getByText("Escrow Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Recent Payouts & Billing")).toBeInTheDocument();
    expect(screen.getByText("Q3 Earnings Statement")).toBeInTheDocument();
    expect(screen.queryByText("Workspace wealth route body")).not.toBeInTheDocument();

    const agencyFinancialNav = screen.getByRole("navigation", { name: /agency financial navigation/i });
    expect(within(agencyFinancialNav).getByRole("link", { name: /^wealth$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it.each([
    ["/workspace/estate-elite/new", /create exclusive listing/i, "Workspace new route body"],
    ["/workspace/estate-elite/messages", /client intelligence/i, "Workspace messages route body"],
    ["/workspace/estate-elite/finance", /wealth management/i, "Workspace finance route body"],
    ["/workspace/estate-elite/payments", /wealth management/i, "Workspace payments route body"],
  ])("renders the custom mobile workspace experience for routed slug %s", async (path, heading, bodyText) => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "manager-1",
          email: "manager@baytmiftah.com",
          user_metadata: { full_name: "Manager One" },
        } as any,
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        id: "org-1",
        name: "Estate Elite",
        slug: "estate-elite",
        role: "owner",
      },
    ] as any);

    renderMobileShell(path, <div>{bodyText}</div>);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText(bodyText)).not.toBeInTheDocument();
  });

  it("renders the custom mobile agency settings experience", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "manager-1",
          email: "manager@baytmiftah.com",
          user_metadata: { full_name: "Manager One" },
        } as any,
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        id: "org-1",
        name: "Estate Elite",
        slug: "estate-elite",
        role: "owner",
      },
    ] as any);

    renderMobileShell("/workspace?next=settings", <div>Workspace settings route body</div>);

    expect(await screen.findByRole("heading", { name: /agency settings/i })).toBeInTheDocument();
    expect(screen.getByText("Estate Elite")).toBeInTheDocument();
    expect(screen.getByText("Commission Structure")).toBeInTheDocument();
    expect(screen.getByText(/85\s\/\s15/)).toBeInTheDocument();
    expect(screen.getByText("$100,000")).toBeInTheDocument();
    expect(screen.getByText("Branding")).toBeInTheDocument();
    expect(screen.getByText("Sterling & Co.")).toBeInTheDocument();
    expect(screen.getByText("Lead Assignment")).toBeInTheDocument();
    expect(screen.getByText("Priority Routing")).toBeInTheDocument();
    expect(screen.getByText("Intelligence Engine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view report/i })).toBeInTheDocument();
    expect(screen.queryByText("Workspace settings route body")).not.toBeInTheDocument();

    const agencySettingsNav = screen.getByRole("navigation", { name: /agency settings navigation/i });
    expect(within(agencySettingsNav).getByRole("link", { name: /^team$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("renders the custom mobile agency team operation experience", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "manager-1",
          email: "manager@baytmiftah.com",
          user_metadata: { full_name: "Manager One" },
        } as any,
      }) as any
    );
    getUserOrganizationsMock.mockResolvedValue([
      {
        id: "org-1",
        name: "Estate Elite",
        slug: "estate-elite",
        role: "owner",
      },
    ] as any);

    renderMobileShell("/workspace?next=team", <div>Workspace team route body</div>);

    expect(await screen.findByRole("heading", { name: /sterling group hierarchy/i })).toBeInTheDocument();
    expect(screen.getByText("Estate Elite")).toBeInTheDocument();
    expect(screen.getByText("Agency Team Management")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /invite new member/i })).toBeInTheDocument();
    expect(screen.getByText("Group GMV")).toBeInTheDocument();
    expect(screen.getByText("$128.4M")).toBeInTheDocument();
    expect(screen.getByText("Active Listings")).toBeInTheDocument();
    expect(screen.getByText("Team Directory")).toBeInTheDocument();
    expect(screen.getByText("Julian Vane")).toBeInTheDocument();
    expect(screen.getByText("Elena Rossi")).toBeInTheDocument();
    expect(screen.getByText("Access Hierarchy")).toBeInTheDocument();
    expect(screen.getByText("Tier I: Principal")).toBeInTheDocument();
    expect(screen.queryByText("Workspace team route body")).not.toBeInTheDocument();

    const agencyTeamNav = screen.getByRole("navigation", { name: /agency team navigation/i });
    expect(within(agencyTeamNav).getByRole("link", { name: /^team$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it.each([
    { path: "/property/listing-1", title: "Property", activeTab: "Explore" },
    { path: "/agencies", title: "Agencies", activeTab: "Explore" },
    { path: "/agencies/prime-estates", title: "Agency", activeTab: "Explore" },
    { path: "/market-trends", title: "Market trends", activeTab: "Explore" },
    { path: "/buyer-requests", title: "Buyer requests", activeTab: "Explore" },
    { path: "/projects", title: "Projects", activeTab: "Explore" },
    { path: "/projects/project-1", title: "Project", activeTab: "Explore" },
    { path: "/reviews", title: "Public reviews", activeTab: "Profile" },
    { path: "/get-the-app", title: "Get the app", activeTab: "Profile" },
    { path: "/legal/terms", title: "Terms of Use", activeTab: "Profile" },
    { path: "/app/deals", title: "Deal Rooms", activeTab: "Messages" },
    { path: "/app/messages", title: "Messages", activeTab: "Messages" },
    { path: "/app/compare", title: "Compare", activeTab: "Saved" },
    { path: "/app/groups", title: "Buying Group", activeTab: "Saved" },
    { path: "/app/referrals", title: "Referrals", activeTab: "Profile" },
  ])("places $path under the relevant mobile route chrome", async ({ path, title, activeTab }) => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell(path, <div>Route body for {path}</div>);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(`Route body for ${path}`)).toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    if (activeTab) {
      expect(within(tabBar).getByRole("link", { name: new RegExp(`^${activeTab}$`, "i") }))
        .toHaveAttribute("aria-current", "page");
    } else {
      expect(within(tabBar).getByRole("link", { name: /^explore$/i })).not.toHaveAttribute("aria-current", "page");
    }
  });
});
