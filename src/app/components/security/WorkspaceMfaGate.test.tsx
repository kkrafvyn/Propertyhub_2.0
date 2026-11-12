import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { WorkspaceMfaGate } from "./WorkspaceMfaGate";
import { hasMfaAssurance } from "../../../lib/security/mfa";
vi.mock("../../../lib/security/mfa", () => ({
  hasMfaAssurance: vi.fn(),
  hasWorkspaceMfaSkip: () => true,
  workspaceRoleRequiresMfa: (role: string) => role === "owner",
}));
vi.mock("../ux", () => ({
  PageLoadingSkeleton: () => <div>Checking security</div>,
}));
beforeEach(() => {
  vi.clearAllMocks();
});
it("requires verification even when an old workspace skip flag exists", async () => {
  vi.mocked(hasMfaAssurance).mockResolvedValue(false);
  render(
    <MemoryRouter initialEntries={["/workspace"]}>
      <Routes>
        <Route
          path="/workspace"
          element={
            <WorkspaceMfaGate role="owner">
              <div>Protected content</div>
            </WorkspaceMfaGate>
          }
        />
        <Route path="/app/security" element={<div>Verify authenticator</div>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Verify authenticator")).toBeInTheDocument();
  expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
});
it("allows a required role only after verification succeeds", async () => {
  vi.mocked(hasMfaAssurance).mockResolvedValue(true);
  render(
    <MemoryRouter>
      <WorkspaceMfaGate role="owner">
        <div>Protected content</div>
      </WorkspaceMfaGate>
    </MemoryRouter>,
  );
  expect(await screen.findByText("Protected content")).toBeInTheDocument();
});
