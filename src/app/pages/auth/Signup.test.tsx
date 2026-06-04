import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Signup } from "./Signup";
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

function renderSignup() {
  const router = createMemoryRouter(
    [
      {
        path: "/signup",
        element: <Signup />,
      },
      {
        path: "/login",
        element: <div>Login Page</div>,
      },
    ],
    {
      initialEntries: ["/signup"],
    }
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("Signup", () => {
  it("starts Google OAuth for buyer account creation", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createAuthState({ signInWithOAuth }) as any);

    renderSignup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^google$/i }));

    expect(signInWithOAuth).toHaveBeenCalledWith(
      "google",
      "https://baytmiftah-krafvyn.vercel.app/login?next=%2Fapp"
    );
  });

  it("starts Apple OAuth for buyer account creation", async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(createAuthState({ signInWithOAuth }) as any);

    renderSignup();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^apple$/i }));

    expect(signInWithOAuth).toHaveBeenCalledWith(
      "apple",
      "https://baytmiftah-krafvyn.vercel.app/login?next=%2Fapp"
    );
  });
});
