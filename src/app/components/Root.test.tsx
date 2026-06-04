import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Root } from "./Root";

const mocks = vi.hoisted(() => ({
  watchDeepLinks: vi.fn(async () => vi.fn()),
  watchKeyboardInset: vi.fn(async () => vi.fn()),
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

function renderRoot(path = "/app") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Root />}>
          <Route index element={<div>Home body</div>} />
          <Route path="app" element={<div>App body</div>} />
          <Route path="app/*" element={<div>App body</div>} />
          <Route path="search" element={<div>Search body</div>} />
          <Route path="property/:id" element={<div>Property body</div>} />
          <Route path="agencies/:slug" element={<div>Agency profile body</div>} />
          <Route path="guides" element={<div>Guides body</div>} />
          <Route path="guides/:slug" element={<div>Guide detail body</div>} />
          <Route path="login" element={<div>Login body</div>} />
          <Route path="signup" element={<div>Signup body</div>} />
          <Route path="verify/:token" element={<div>Receipt body</div>} />
          <Route path="legal/terms" element={<div>Terms body</div>} />
          <Route path="projects" element={<div>Projects body</div>} />
          <Route path="admin/*" element={<div>Admin body</div>} />
          <Route path="baytmiftah/marketplace" element={<div>Old marketplace body</div>} />
          <Route path="baytmiftah/property" element={<div>Old property body</div>} />
          <Route path="baytmiftah/aureus-listings" element={<div>Old listings body</div>} />
          <Route path="baytmiftah/mobile-workspace" element={<div>Old mobile workspace body</div>} />
          <Route path="baytmiftah/secure-login" element={<div>Old auth body</div>} />
          <Route path="*" element={<div>Fallback body</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Root", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the home route inside the new app shell", () => {
    renderRoot("/");

    expect(screen.getByTestId("mobile-shell")).toBeInTheDocument();
    expect(screen.getByText("Home body")).toBeInTheDocument();
    expect(screen.queryByText("Old marketplace body")).not.toBeInTheDocument();
  });

  it.each([
    ["/app", "App body"],
    ["/app/payments", "App body"],
    ["/search", "Search body"],
    ["/property/demo", "Property body"],
    ["/agencies/demo", "Agency profile body"],
    ["/guides", "Guides body"],
    ["/guides/palm", "Guide detail body"],
    ["/verify/demo-token", "Receipt body"],
    ["/legal/terms", "Terms body"],
    ["/projects", "Projects body"],
  ])("wraps %s in the new app shell", (path, text) => {
    renderRoot(path);

    expect(screen.getByTestId("mobile-shell")).toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it.each([
    ["/login", "Login body"],
    ["/signup", "Signup body"],
    ["/admin/users", "Admin body"],
  ])("keeps %s outside the public app shell", (path, text) => {
    renderRoot(path);

    expect(screen.queryByTestId("mobile-shell")).not.toBeInTheDocument();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it.each([
    ["/baytmiftah/marketplace", "Home body", "Old marketplace body"],
    ["/baytmiftah/property", "Property body", "Old property body"],
    ["/baytmiftah/aureus-listings", "Search body", "Old listings body"],
    ["/baytmiftah/mobile-workspace", "App body", "Old mobile workspace body"],
    ["/baytmiftah/secure-login", "Login body", "Old auth body"],
  ])("redirects stale preview route %s into the canonical route", (path, text, oldText) => {
    renderRoot(path);

    if (path === "/baytmiftah/secure-login") {
      expect(screen.queryByTestId("mobile-shell")).not.toBeInTheDocument();
    } else {
      expect(screen.getByTestId("mobile-shell")).toBeInTheDocument();
    }

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByText(oldText)).not.toBeInTheDocument();
  });
});
