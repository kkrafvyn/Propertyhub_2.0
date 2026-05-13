import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { useAuth } from "../context/AuthContext";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

function createAuthState(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    loading: false,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
    ...overrides,
  };
}

function renderProtectedRoute() {
  const router = createMemoryRouter(
    [
      {
        path: "/private",
        element: (
          <ProtectedRoute>
            <div>Private Content</div>
          </ProtectedRoute>
        ),
      },
      {
        path: "/login",
        element: <div>Login Page</div>,
      },
    ],
    {
      initialEntries: ["/private"],
    }
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to the login screen", async () => {
    useAuthMock.mockReturnValue(createAuthState());
    const router = renderProtectedRoute();

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("renders protected content for authenticated users", () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "user-1",
          email: "agent@example.com",
          user_metadata: {},
        } as any,
      })
    );

    renderProtectedRoute();

    expect(screen.getByText("Private Content")).toBeInTheDocument();
  });
});
