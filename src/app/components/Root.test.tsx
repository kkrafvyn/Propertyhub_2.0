import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Root } from "./Root";

const mocks = vi.hoisted(() => ({
  isNativePlatform: vi.fn(),
  useAuth: vi.fn(),
  watchDeepLinks: vi.fn(async () => vi.fn()),
  watchKeyboardInset: vi.fn(async () => vi.fn()),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../mobile/MobileAppShell", () => ({
  MobileAppShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="mobile-shell">{children}</div>
  ),
}));

vi.mock("../../lib/mobile-native.service", () => ({
  mobileNativeService: {
    watchDeepLinks: mocks.watchDeepLinks,
    watchKeyboardInset: mocks.watchKeyboardInset,
  },
}));

vi.mock("../../lib/mobile-deep-link.service", () => ({
  mobileDeepLinkService: {
    toAppPath: vi.fn((url: string) => url),
  },
}));

function mockViewport(matches: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderRoot(path = "/app") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Root />}>
          <Route index element={<div>Home body</div>} />
          <Route path="app" element={<div>App body</div>} />
          <Route path="search" element={<div>Search body</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Root", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.useAuth.mockReturnValue({ user: null });
    mockViewport(false);
  });

  it("uses the mobile app shell for signed-in mobile web users", () => {
    mocks.useAuth.mockReturnValue({ user: { id: "user-1" } });
    mockViewport(true);

    renderRoot("/app");

    expect(screen.getByTestId("mobile-shell")).toHaveTextContent("App body");
  });

  it("keeps signed-out mobile web users on the normal web layout", () => {
    mockViewport(true);

    renderRoot("/search");

    expect(screen.queryByTestId("mobile-shell")).not.toBeInTheDocument();
    expect(screen.getByText("Search body")).toBeInTheDocument();
  });
});
