import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

const mocks = vi.hoisted(() => ({
  user: { id: "security-test-user" },
  mfa: {
    listFactors: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
    enroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
    unenroll: vi.fn(),
  },
  clearSkip: vi.fn(),
  t: (key: string) => key,
}));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user }),
}));
vi.mock("../../i18n/LocaleContext", () => ({
  useTranslation: () => ({ t: mocks.t }),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false },
}));
vi.mock("../../../lib/supabase", () => ({
  supabase: {
    auth: { mfa: mocks.mfa },
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        order: () => Promise.resolve({ data: [] }),
      };
      return query;
    },
  },
}));
vi.mock("../../../lib/security/session-tracking", () => ({
  trackUserSession: async () => null,
  removeSessionFromActivityList: vi.fn(),
}));
vi.mock("../../../lib/native-plugins.service", () => ({
  nativePluginsService: { isBiometricAvailable: async () => false },
}));
vi.mock("../../../lib/biometric-preferences", () => ({
  isBiometricAppLockEnabled: () => false,
  setBiometricAppLockEnabled: vi.fn(),
}));
vi.mock("../../../lib/security/mfa", () => ({
  clearWorkspaceMfaSkip: mocks.clearSkip,
  setWorkspaceMfaSkip: vi.fn(),
}));
vi.mock("../../../lib/workspace", () => ({
  WORKSPACE_ENTRY_PATH: "/workspace",
}));
vi.mock("../../components/baytmiftah/PageMeta", () => ({
  PageMeta: () => null,
}));
vi.mock("../../components/ux", () => ({
  PageLayout: ({ children }: any) => <div>{children}</div>,
  ConsumerHubChrome: ({ children }: any) => <div>{children}</div>,
  PageHeader: () => <h1>Account security</h1>,
}));
vi.mock("../../components/ux/ActionDialog", () => ({
  ActionDialog: () => null,
}));
import { SecuritySettingsPage } from "./SecuritySettings";

const verified = {
  id: "existing-factor",
  status: "verified",
  friendly_name: "My authenticator",
};
const aal = (level: string) => ({
  data: { currentLevel: level, nextLevel: "aal2" },
  error: null,
});
const showPage = (entry = "/app/security") =>
  render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: entry.split("?")[0],
          search: entry.includes("?") ? `?${entry.split("?")[1]}` : "",
          state: { from: "/admin/payments" },
        },
      ]}
    >
      <Routes>
        <Route path="/app/security" element={<SecuritySettingsPage />} />
        <Route path="/admin/payments" element={<h1>Admin destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.mfa.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
  mocks.mfa.getAuthenticatorAssuranceLevel.mockResolvedValue(aal("aal1"));
  mocks.mfa.enroll.mockResolvedValue({
    data: {
      id: "new-factor",
      totp: {
        qr_code:
          "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E",
        secret: "TEST-SETUP-KEY",
      },
    },
    error: null,
  });
  mocks.mfa.challenge.mockResolvedValue({
    data: { id: "challenge-1" },
    error: null,
  });
  mocks.mfa.verify.mockResolvedValue({ data: {}, error: null });
  mocks.mfa.unenroll.mockResolvedValue({ data: {}, error: null });
});

describe("SecuritySettings authenticator flow", () => {
  it("shows an unavailable state rather than claiming MFA is off when status loading fails", async () => {
    mocks.mfa.listFactors.mockResolvedValue({
      data: null,
      error: new Error("unavailable"),
    });
    showPage();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "couldn’t check",
    );
    expect(
      screen.queryByRole("button", { name: "Set up authenticator" }),
    ).not.toBeInTheDocument();
    mocks.mfa.listFactors.mockResolvedValue({
      data: { totp: [] },
      error: null,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Refresh security status" }),
    );
    expect(
      await screen.findByRole("button", { name: "Set up authenticator" }),
    ).toBeEnabled();
  });

  it("shows setup, hides the secret until requested, validates digits and retains setup after a bad code", async () => {
    mocks.mfa.verify.mockResolvedValue({
      data: null,
      error: new Error("Code expired. Use the current code."),
    });
    showPage();
    await userEvent.click(
      await screen.findByRole("button", { name: "Set up authenticator" }),
    );
    expect(
      await screen.findByRole("img", { name: /Scan this QR/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText("TEST-SETUP-KEY")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Show setup key" }),
    );
    expect(screen.getByText("TEST-SETUP-KEY")).toBeInTheDocument();
    const code = screen.getByLabelText("Six-digit authenticator code");
    fireEvent.change(code, { target: { value: "12a34" } });
    expect(code).toHaveValue("1234");
    expect(
      screen.getByRole("button", { name: "Verify and enable" }),
    ).toBeDisabled();
    fireEvent.change(code, { target: { value: "123456" } });
    await userEvent.click(
      screen.getByRole("button", { name: "Verify and enable" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Code expired");
    expect(
      screen.getByRole("img", { name: /Scan this QR/ }),
    ).toBeInTheDocument();
    expect(mocks.clearSkip).not.toHaveBeenCalled();
  });

  it("cancels only the enrollment created by this screen and clears its setup secret", async () => {
    showPage();
    await userEvent.click(
      await screen.findByRole("button", { name: "Set up authenticator" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Cancel setup" }),
    );
    await waitFor(() =>
      expect(mocks.mfa.unenroll).toHaveBeenCalledWith({
        factorId: "new-factor",
      }),
    );
    expect(
      await screen.findByRole("button", { name: "Set up authenticator" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("checks AAL2 after enrollment and returns an administrator to the requested route", async () => {
    mocks.mfa.listFactors
      .mockResolvedValueOnce({ data: { totp: [] }, error: null })
      .mockResolvedValue({ data: { totp: [verified] }, error: null });
    mocks.mfa.getAuthenticatorAssuranceLevel
      .mockResolvedValueOnce(aal("aal1"))
      .mockResolvedValue(aal("aal2"));
    showPage("/app/security?mfa=required");
    await userEvent.click(
      await screen.findByRole("button", { name: "Set up authenticator" }),
    );
    fireEvent.change(
      await screen.findByLabelText("Six-digit authenticator code"),
      { target: { value: "123456" } },
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Verify and enable" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Admin destination" }),
    ).toBeInTheDocument();
    expect(mocks.mfa.verify).toHaveBeenCalledWith({
      factorId: "new-factor",
      challengeId: "challenge-1",
      code: "123456",
    });
    expect(mocks.clearSkip).toHaveBeenCalledOnce();
  });

  it("does not navigate when the provider accepts a code without elevating assurance", async () => {
    mocks.mfa.listFactors.mockResolvedValue({
      data: { totp: [verified] },
      error: null,
    });
    showPage("/app/security?mfa=required");
    fireEvent.change(
      await screen.findByLabelText("Six-digit authenticator code"),
      { target: { value: "123456" } },
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Verify and continue" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Verification did not finish",
    );
    expect(
      screen.queryByRole("heading", { name: "Admin destination" }),
    ).not.toBeInTheDocument();
    expect(mocks.clearSkip).not.toHaveBeenCalled();
  });

  it("prevents duplicate verification while a challenge is pending", async () => {
    let finish!: (value: any) => void;
    mocks.mfa.challenge.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    showPage();
    await userEvent.click(
      await screen.findByRole("button", { name: "Set up authenticator" }),
    );
    const code = await screen.findByLabelText("Six-digit authenticator code");
    fireEvent.change(code, { target: { value: "123456" } });
    fireEvent.submit(code.closest("form")!);
    fireEvent.submit(code.closest("form")!);
    expect(mocks.mfa.challenge).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Verifying…" })).toBeDisabled();
    finish({ data: { id: "challenge-1" }, error: null });
    await screen.findByRole("alert"); // AAL1 is deliberately retained in this fixture.
  });
});
