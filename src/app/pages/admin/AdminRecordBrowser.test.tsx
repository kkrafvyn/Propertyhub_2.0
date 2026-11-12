import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminRecordBrowser } from "./AdminRecordBrowser";
import { AdminPlatformCommunications } from "./AdminPlatformCommunications";
import {
  fetchAdminRecords,
  adminOperationsService,
} from "../../../lib/admin-operations.service";
const access = vi.hoisted(() => ({ allowed: true }));
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      platform_console_grants: access.allowed ? ["communications"] : [],
    },
  }),
}));
vi.mock("../../../lib/admin-operations.service", () => ({
  ADMIN_PAGE_SIZE: 25,
  fetchAdminRecords: vi.fn(),
  adminOperationsService: { communicationHealth: vi.fn() },
}));
const columns = [{ key: "status", label: "Status" }];
beforeEach(() => {
  vi.clearAllMocks();
  access.allowed = true;
  vi.mocked(fetchAdminRecords).mockResolvedValue({
    rows: [{ id: "record-1", status: "failed" }],
    count: 26,
  });
});
describe("admin record browsing", () => {
  it("applies server filters and resets pagination on a new search", async () => {
    const user = userEvent.setup();
    render(
      <AdminRecordBrowser
        kind="communications"
        title="Deliveries"
        description="All deliveries"
        columns={columns}
        statuses={["failed"]}
        organizationFilter
      />,
    );
    await screen.findByText("failed");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(fetchAdminRecords).toHaveBeenLastCalledWith(
        "communications",
        expect.objectContaining({ page: 1 }),
      ),
    );
    await user.type(screen.getByLabelText("Search records"), "provider-42");
    await user.selectOptions(screen.getByLabelText("Status"), "failed");
    await user.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() =>
      expect(fetchAdminRecords).toHaveBeenLastCalledWith(
        "communications",
        expect.objectContaining({
          search: "provider-42",
          status: "failed",
          page: 0,
        }),
      ),
    );
  });
  it("shows errors without presenting an empty result and recovers on retry", async () => {
    vi.mocked(fetchAdminRecords).mockRejectedValueOnce(
      new Error("Permission denied"),
    );
    const user = userEvent.setup();
    render(
      <AdminRecordBrowser
        kind="payments"
        title="Payments"
        description="Ledger"
        columns={columns}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Permission denied",
    );
    expect(
      screen.queryByText("No records match these filters."),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("failed")).toBeInTheDocument();
  });
  it("opens and closes record details", async () => {
    const user = userEvent.setup();
    render(
      <AdminRecordBrowser
        kind="payments"
        title="Payments"
        description="Ledger"
        columns={columns}
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "View record-1" }),
    );
    expect(
      screen.getByRole("region", { name: "Record details" }),
    ).toHaveTextContent("record-1");
    await user.click(screen.getByRole("button", { name: "Close details" }));
    expect(
      screen.queryByRole("region", { name: "Record details" }),
    ).not.toBeInTheDocument();
  });
  it("does not query private records or diagnostics without section access", () => {
    access.allowed = false;
    render(<AdminPlatformCommunications />);
    expect(
      screen.getByText("Communications access restricted"),
    ).toBeInTheDocument();
    expect(fetchAdminRecords).not.toHaveBeenCalled();
    expect(adminOperationsService.communicationHealth).not.toHaveBeenCalled();
  });
  it("reports missing WhatsApp configuration without claiming the connection works", async () => {
    vi.mocked(adminOperationsService.communicationHealth).mockResolvedValue({
      checkedAt: new Date().toISOString(),
      checks: [
        {
          name: "Webhook verification",
          ready: false,
          detail: "Configure verification token",
        },
      ],
    });
    const user = userEvent.setup();
    render(<AdminPlatformCommunications />);
    await user.click(screen.getByRole("button", { name: "Check connection" }));
    expect(
      await screen.findByText("Needs attention · Webhook verification"),
    ).toBeInTheDocument();
  });
});
