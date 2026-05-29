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

    expect(await screen.findByText(/fresh listings/i)).toBeInTheDocument();
    expect(screen.queryByText(/continue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quick paths/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /projects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /public reviews/i })).not.toBeInTheDocument();
    expect(within(tabBar).getByRole("link", { name: /^search$/i })).toHaveAttribute(
      "href",
      "/#mobile-search"
    );

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));

    expect(screen.getByRole("link", { name: /home valuation/i })).toHaveAttribute(
      "href",
      "/valuation"
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

    await screen.findByText("Discover");

    expect(await within(tabBar).findByText("4")).toBeInTheDocument();
    expect(within(tabBar).getByText("2")).toBeInTheDocument();
    expect(within(tabBar).getByText("1")).toBeInTheDocument();

    await user.click(within(tabBar).getByRole("link", { name: /^messages$/i }));
    expect(screen.getByRole("link", { name: /deal rooms/i })).toHaveAttribute("href", "/app/deals");
    expect(screen.getByRole("link", { name: /viewings/i })).toHaveAttribute("href", "/app/viewings");
    expect(
      screen
        .getAllByRole("link", { name: /messages/i })
        .some((link) => link.getAttribute("href") === "/app/messages")
    ).toBe(true);
    expect(screen.getByRole("link", { name: /payments/i })).toHaveAttribute("href", "/app/payments");

    await user.click(within(tabBar).getByRole("link", { name: /^saved$/i }));
    expect(screen.getAllByRole("link", { name: /compare saved listings/i })[0]).toHaveAttribute(
      "href",
      "/app/compare"
    );
    expect(screen.getByRole("link", { name: /buying guide/i })).toHaveAttribute(
      "href",
      "/app/buying-tools"
    );

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));
    expect(screen.getByRole("link", { name: /referrals/i })).toHaveAttribute(
      "href",
      "/app/referrals"
    );
    expect(screen.getByRole("link", { name: /support/i })).toHaveAttribute("href", "/app/support");
    expect(screen.getByRole("link", { name: /prime estates/i })).toHaveAttribute(
      "href",
      "/workspace/prime-estates"
    );
  });

  it("exposes native push and offline field capture tools from the account tab", async () => {
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
    await user.click(await screen.findByRole("button", { name: /turn on alerts/i }));

    expect(registerPushMock).toHaveBeenCalledWith("user-1", expect.any(Object));

    await user.click(screen.getByRole("button", { name: /add photos/i }));

    expect(capturePropertyPhotoMock).toHaveBeenCalled();
    expect(enqueueOfflineMock).toHaveBeenCalledWith(
      "listing-photo",
      expect.objectContaining({
        capturedBy: "user-1",
        photo: expect.objectContaining({ id: "photo-1" }),
      })
    );

    await user.type(
      screen.getByPlaceholderText(/quick note from a viewing/i),
      "Owner prefers Saturday morning."
    );
    await user.click(screen.getByRole("button", { name: /save note/i }));

    expect(enqueueOfflineMock).toHaveBeenCalledWith(
      "field-note",
      expect.objectContaining({
        note: "Owner prefers Saturday morning.",
      })
    );
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

    expect(await screen.findByText("Get help")).toBeInTheDocument();
    expect(screen.queryByText("Field kit")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add photos/i })).not.toBeInTheDocument();
  });

  it("only shows the bottom navigation for signed-in mobile users", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);

    renderMobileShell();

    await screen.findByText("Discover");
    await waitFor(() => expect(countOfflineQueueMock).toHaveBeenCalled());
    expect(
      screen.queryByRole("navigation", { name: /primary mobile navigation/i })
    ).not.toBeInTheDocument();
  });

  it("keeps signed-in users on the restored light app palette", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell();
    const user = userEvent.setup();
    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });

    await user.click(within(tabBar).getByRole("link", { name: /^profile$/i }));
    await user.click(await screen.findByRole("radio", { name: /miftah light/i }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-app-theme", "light");
    });
    expect(document.documentElement).toHaveAttribute("data-app-theme-preference", "light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(screen.getByRole("radio", { name: /miftah light/i })).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("routes the search tab back to the home search bar instead of an internal pane", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/?tab=search");

    expect(await screen.findByText("Discover")).toBeInTheDocument();
    expect(screen.queryByText("Find the right fit")).not.toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    expect(within(tabBar).getByRole("link", { name: /^search$/i })).toHaveAttribute(
      "href",
      "/#mobile-search"
    );
  });

  it("wraps direct mobile routes inside the shared app frame", async () => {
    useAuthMock.mockReturnValue(createSignedInAuthState() as any);

    renderMobileShell("/search", <div>Search route body</div>);

    expect(await screen.findByText("Search results")).toBeInTheDocument();
    expect(screen.getByText("Search route body")).toBeInTheDocument();

    const tabBar = screen.getByRole("navigation", { name: /primary mobile navigation/i });
    expect(within(tabBar).getByRole("link", { name: /^search$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it.each([
    { path: "/search", title: "Search results", activeTab: "Search" },
    { path: "/property/listing-1", title: "Property", activeTab: "Search" },
    { path: "/agencies", title: "Agencies", activeTab: "Home" },
    { path: "/agencies/prime-estates", title: "Agency", activeTab: "Home" },
    { path: "/guides", title: "Area guides", activeTab: "Search" },
    { path: "/guides/osu", title: "Area guide", activeTab: "Search" },
    { path: "/market-trends", title: "Market trends", activeTab: "Search" },
    { path: "/buyer-requests", title: "Buyer requests", activeTab: "Search" },
    { path: "/projects", title: "Projects", activeTab: "Search" },
    { path: "/projects/project-1", title: "Project", activeTab: "Search" },
    { path: "/valuation", title: "Home valuation", activeTab: "Profile" },
    { path: "/reviews", title: "Public reviews", activeTab: "Profile" },
    { path: "/get-the-app", title: "Get the app", activeTab: "Profile" },
    { path: "/legal/terms", title: "Terms of Use", activeTab: "Profile" },
    { path: "/legal/privacy", title: "Privacy Notice", activeTab: "Profile" },
    { path: "/app/deals", title: "Deal Rooms", activeTab: "Messages" },
    { path: "/app/concierge", title: "Concierge", activeTab: "Messages" },
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
    expect(within(tabBar).getByRole("link", { name: new RegExp(`^${activeTab}$`, "i") }))
      .toHaveAttribute("aria-current", "page");
  });
});
