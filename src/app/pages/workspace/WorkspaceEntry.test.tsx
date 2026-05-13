import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceEntry } from "./WorkspaceEntry";
import { useAuth } from "../../context/AuthContext";
import { organizationService } from "../../../lib/organization.service";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../lib/organization.service", () => ({
  organizationService: {
    getUserOrganizations: vi.fn(),
    createOrganization: vi.fn(),
  },
}));

const useAuthMock = vi.mocked(useAuth);
const getUserOrganizationsMock = vi.mocked(organizationService.getUserOrganizations);

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

    renderWorkspaceEntry();

    await waitFor(() => {
      expect(screen.getByText("Create your organization")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();
  });
});
