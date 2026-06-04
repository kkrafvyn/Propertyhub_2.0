import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Root } from "./Root";

const mocks = vi.hoisted(() => ({
  watchDeepLinks: vi.fn(async () => vi.fn()),
  watchKeyboardInset: vi.fn(async () => vi.fn()),
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
          <Route path="app/*" element={<div>App body</div>} />
          <Route path="baytmiftah" element={<div>New BaytMiftah home body</div>} />
          <Route path="baytmiftah/agency" element={<div>New agency body</div>} />
          <Route path="baytmiftah/areas" element={<div>New areas body</div>} />
          <Route path="baytmiftah/aureus-compliance" element={<div>New compliance body</div>} />
          <Route path="baytmiftah/aureus-district" element={<div>New district body</div>} />
          <Route path="baytmiftah/aureus-listings" element={<div>New listings body</div>} />
          <Route path="baytmiftah/aureus-analytics" element={<div>New analytics body</div>} />
          <Route path="baytmiftah/developments" element={<div>New developments body</div>} />
          <Route path="baytmiftah/innovation" element={<div>New innovation body</div>} />
          <Route path="baytmiftah/marketplace" element={<div>New marketplace body</div>} />
          <Route path="baytmiftah/messages" element={<div>New messages body</div>} />
          <Route path="baytmiftah/mobile-landing" element={<div>New mobile landing body</div>} />
          <Route path="baytmiftah/mobile-workspace" element={<div>New mobile workspace body</div>} />
          <Route path="baytmiftah/payments-escrow" element={<div>New payments escrow body</div>} />
          <Route path="baytmiftah/property" element={<div>New property body</div>} />
          <Route path="baytmiftah/secure-login" element={<div>New secure login body</div>} />
          <Route path="baytmiftah/admin-platform" element={<div>New admin platform body</div>} />
          <Route path="baytmiftah/users" element={<div>New users body</div>} />
          <Route path="*" element={<div>Old fallback body</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Root", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects app entry to the new mobile workspace UI", () => {
    renderRoot("/app");

    expect(screen.queryByText("App body")).not.toBeInTheDocument();
    expect(screen.getByText("New mobile workspace body")).toBeInTheDocument();
  });

  it.each([
    "/login",
    "/login/verify",
    "/forgot-password",
    "/signup",
  ])("redirects auth page %s to the new secure login UI", (path) => {
    renderRoot(path);

    expect(screen.queryByText("Login body")).not.toBeInTheDocument();
    expect(screen.getByText("New secure login body")).toBeInTheDocument();
  });

  it("redirects public search to the new listings UI", () => {
    renderRoot("/search");

    expect(screen.queryByText("Search body")).not.toBeInTheDocument();
    expect(screen.getByText("New listings body")).toBeInTheDocument();
  });

  it("redirects the home route to the new marketplace UI", () => {
    renderRoot("/");

    expect(screen.queryByText("Home body")).not.toBeInTheDocument();
    expect(screen.getByText("New marketplace body")).toBeInTheDocument();
  });

  it.each([
    ["/legal/terms", "New compliance body"],
    ["/verify/demo-token", "New compliance body"],
    ["/projects", "New developments body"],
    ["/projects/palm", "New developments body"],
    ["/property/demo", "New property body"],
    ["/agencies/demo", "New agency body"],
    ["/guides", "New areas body"],
    ["/guides/palm", "New district body"],
    ["/market-trends", "New analytics body"],
    ["/sold-ledger", "New payments escrow body"],
    ["/reviews", "New messages body"],
    ["/innovation-lab", "New innovation body"],
    ["/feature-completion", "New innovation body"],
    ["/buyer-requests", "New users body"],
    ["/valuation", "New innovation body"],
    ["/get-the-app", "New mobile landing body"],
    ["/workspace/team", "New agency body"],
    ["/admin/users", "New admin platform body"],
  ])("redirects routed legacy page %s to a new UI surface", (path, text) => {
    renderRoot(path);

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("renders direct BaytMiftah marketplace routes without redirecting to old pages", () => {
    renderRoot("/baytmiftah/marketplace");

    expect(screen.queryByText("Home body")).not.toBeInTheDocument();
    expect(screen.getByText("New marketplace body")).toBeInTheDocument();
  });

  it("renders the BaytMiftah index route without redirecting away", () => {
    renderRoot("/baytmiftah");

    expect(screen.getByText("New BaytMiftah home body")).toBeInTheDocument();
  });
});
