import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Login } from "./Login";
import { useAuth } from "../../context/AuthContext";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

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

function renderLogin(initialEntry = "/login?next=%2Fworkspace%3Fnext%3Dnew") {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <div>Home Page</div>,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/workspace",
        element: <div>Workspace Landing</div>,
      },
      {
        path: "/app",
        element: <div>User App</div>,
      },
    ],
    {
      initialEntries: [initialEntry],
    }
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("Login", () => {
  it("uses email and password as the primary login flow", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createAuthState({ signIn }) as any);

    const router = renderLogin();
    const user = userEvent.setup();

    expect(screen.queryByRole("button", { name: /phone otp/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Email Address"), "agent@example.com");
    await user.type(screen.getByLabelText("Password"), "secret-pass");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("agent@example.com", "secret-pass");
      expect(router.state.location.pathname).toBe("/workspace");
    });
  });

  it("starts Google OAuth with the home redirect target", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createAuthState({ signInWithOAuth }) as any);

    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /google/i }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith(
        "google",
        "https://baytmiftah-krafvyn.vercel.app/login?next=%2F"
      );
    });
  });

  it("starts Apple OAuth with the intended redirect target", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createAuthState({ signInWithOAuth }) as any);

    renderLogin();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /apple/i }));

    await waitFor(() => {
      expect(signInWithOAuth).toHaveBeenCalledWith(
        "apple",
        "https://baytmiftah-krafvyn.vercel.app/login?next=%2Fworkspace%3Fnext%3Dnew"
      );
    });
  });

  it("redirects authenticated users to the requested destination", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "user-1",
          email: "agent@example.com",
          user_metadata: {},
        },
      }) as any
    );

    const router = renderLogin("/login?next=%2Fapp");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app");
    });
  });

  it("redirects Google OAuth callbacks to the home page", async () => {
    useAuthMock.mockReturnValue(
      createAuthState({
        user: {
          id: "user-1",
          email: "buyer@example.com",
          app_metadata: { provider: "google" },
          user_metadata: {},
        },
      }) as any
    );

    const router = renderLogin("/login?next=%2F");

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
  });

  it("does not follow localhost next redirects after authentication", async () => {
    const signIn = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createAuthState({ signIn }) as any);

    const router = renderLogin("/login?next=http%3A%2F%2Flocalhost%3A5173%2Fworkspace");
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Email Address"), "agent@example.com");
    await user.type(screen.getByLabelText("Password"), "secret-pass");
    await user.click(screen.getByRole("button", { name: /^log in$/i }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/app");
    });
  });
});
