import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceEntry } from "./WorkspaceEntry";
import { useAuth } from "../../context/AuthContext";
import { organizationService } from "../../../lib/organization.service";
import { enrollmentService } from "../../../lib/enrollment.service";
import { useMyKyc } from "../../hooks/useMyKyc";
import { LocaleProvider } from "../../i18n/LocaleContext";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../hooks/useMyKyc", () => ({
  useMyKyc: vi.fn(),
}));

vi.mock("../../../lib/enrollment.service", () => ({
  enrollmentService: {
    getPendingRequest: vi.fn(),
    getMyRequests: vi.fn(),
    submitRequest: vi.fn(),
  },
}));

vi.mock("../../../lib/organization.service", () => ({
  organizationService: {
    getUserOrganizations: vi.fn(),
    createOrganization: vi.fn(),
  },
}));

const useAuthMock = vi.mocked(useAuth);
const useMyKycMock = vi.mocked(useMyKyc);
const getUserOrganizationsMock = vi.mocked(organizationService.getUserOrganizations);
const getPendingRequestMock = vi.mocked(enrollmentService.getPendingRequest);
const getMyRequestsMock = vi.mocked(enrollmentService.getMyRequests);

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

  render(
    <LocaleProvider>
      <RouterProvider router={router} />
    </LocaleProvider>,
  );
  return router;
}

describe("WorkspaceEntry", () => {
  beforeEach(() => {
    useMyKycMock.mockReturnValue({
      kyc: { submission: { status: "submitted", id: "kyc-1" } },
      loading: false,
      verified: false,
    } as any);
  });

  it("redirects members into their workspace when an organization exists", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);
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
    getPendingRequestMock.mockResolvedValue(null);
    getMyRequestsMock.mockResolvedValue([]);

    renderWorkspaceEntry();

    await waitFor(() => {
      expect(screen.getByText("Apply for a workspace")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
  });

  it("preselects organization enrollment for the admin-provided setup link", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);
    getUserOrganizationsMock.mockResolvedValue([]);
    getPendingRequestMock.mockResolvedValue(null);
    getMyRequestsMock.mockResolvedValue([]);

    renderWorkspaceEntry("/workspace?kind=company");

    expect(await screen.findByLabelText("Organization Name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Display name")).not.toBeInTheDocument();
    expect(screen.getByText(/Complete KYC, then submit your organization profile/i)).toBeInTheDocument();
  });
});
