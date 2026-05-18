import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceEntry } from "./WorkspaceEntry";
import { useAuth } from "../../context/AuthContext";
import { organizationService } from "../../../lib/organization.service";
import { subscriptionService } from "../../../lib/subscription.service";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../lib/organization.service", () => ({
  organizationService: {
    getUserOrganizations: vi.fn(),
    createOrganization: vi.fn(),
  },
}));

vi.mock("../../../lib/subscription.service", () => ({
  formatMinorCurrency: (amountMinor: number, currency = "GHS") =>
    `${currency} ${amountMinor / 100}`,
  subscriptionService: {
    getSubscriptionTiers: vi.fn(),
    initializeOrganizationSubscription: vi.fn(),
    verifyOrganizationSubscription: vi.fn(),
  },
}));

const useAuthMock = vi.mocked(useAuth);
const getUserOrganizationsMock = vi.mocked(organizationService.getUserOrganizations);
const getSubscriptionTiersMock = vi.mocked(subscriptionService.getSubscriptionTiers);

const starterTier = {
  id: "starter",
  name: "Starter",
  description: "Small teams",
  currency: "GHS",
  price_minor: 20000,
  billing_interval: "monthly",
  agent_seat_limit: 3,
  active_listing_limit: 15,
  feature_summary: [],
  is_active: true,
  sort_order: 10,
};

function createAuthState() {
  return {
    user: {
      id: "user-1",
      email: "owner@example.com",
      user_metadata: {
        full_name: "Owner Example",
      },
    },
    loading: false,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  };
}

function renderWorkspaceEntry(initialPath = "/workspace?next=listings") {
  const router = createMemoryRouter(
    [
      {
        path: "/workspace",
        element: <WorkspaceEntry />,
      },
      {
        path: "/workspace/:organizationSlug/:page",
        element: <div>Workspace Destination</div>,
      },
    ],
    {
      initialEntries: [initialPath],
    }
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("WorkspaceEntry", () => {
  it("redirects members into their workspace when an organization exists", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);
    getSubscriptionTiersMock.mockResolvedValue([starterTier] as any);
    getUserOrganizationsMock.mockResolvedValue([
      {
        organization: {
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
        },
        role: "owner",
      },
    ] as any);

    const router = renderWorkspaceEntry();

    expect(await screen.findByText("Workspace Destination")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/workspace/prime-properties/listings");
  });

  it("shows the onboarding form when the user has no workspace yet", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);
    getUserOrganizationsMock.mockResolvedValue([]);
    getSubscriptionTiersMock.mockResolvedValue([starterTier] as any);

    renderWorkspaceEntry();

    await waitFor(() => {
      expect(screen.getByText("Create and activate your workspace")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();
  });
});
