import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminOrganizationAccessDialog } from "./AdminOrganizationAccessDialog";
import { adminService, type AdminUserRow } from "../../../lib/admin.service";

vi.mock("../../../lib/admin.service", () => ({ adminService: {
  createUserOrganization: vi.fn(), assignOrganizationMember: vi.fn(), findOrganizations: vi.fn(),
} }));

const user = { id: "member-1", full_name: "Ada", email: "ada@example.com" } as AdminUserRow;
function show() {
  const onClose = vi.fn();
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(<AdminOrganizationAccessDialog user={user} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
}

describe("admin organization access", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(adminService.findOrganizations).mockResolvedValue([
      { id: "org-1", name: "Existing Company", slug: "existing-company", suspended: false },
      { id: "org-2", name: "Suspended Company", slug: "suspended-company", suspended: true },
    ]);
  });

  it("keeps entered values and shows the server's KYC blocker instead of claiming success", async () => {
    vi.mocked(adminService.createUserOrganization).mockRejectedValue({ message: "Approve identity verification first" });
    const { onClose, onSaved } = show();
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Ada Properties" } });
    fireEvent.change(screen.getByLabelText("Workspace slug"), { target: { value: "ada-properties" } });
    fireEvent.click(screen.getByRole("button", { name: "Create organization" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Approve identity verification first");
    expect(screen.getByLabelText("Organization name")).toHaveValue("Ada Properties");
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("creates an organization for the selected user and refreshes after success", async () => {
    vi.mocked(adminService.createUserOrganization).mockResolvedValue("new-org");
    const { onClose, onSaved } = show();
    fireEvent.change(screen.getByLabelText("Organization name"), { target: { value: "Ada Properties" } });
    fireEvent.change(screen.getByLabelText("Workspace slug"), { target: { value: "ada-properties" } });
    fireEvent.click(screen.getByRole("button", { name: "Create organization" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(adminService.createUserOrganization).toHaveBeenCalledWith({
      userId: "member-1", name: "Ada Properties", slug: "ada-properties", businessType: "property_management",
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(adminService.assignOrganizationMember).not.toHaveBeenCalled();
  });

  it("assigns the chosen organization role without creating an organization or offering ownership", async () => {
    vi.mocked(adminService.assignOrganizationMember).mockResolvedValue(undefined);
    const { onSaved } = show();
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "assign" } });
    expect(screen.getByRole("button", { name: "Save membership" })).toBeDisabled();
    await screen.findByRole("option", { name: "Existing Company /existing-company" });
    expect(screen.getByRole("option", { name: /Suspended Company/ })).toBeDisabled();
    expect(screen.queryByRole("option", { name: "Owner / Founder" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Organization"), { target: { value: "org-1" } });
    fireEvent.change(screen.getByLabelText("Member role"), { target: { value: "finance_manager" } });
    fireEvent.click(screen.getByRole("button", { name: "Save membership" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(adminService.assignOrganizationMember).toHaveBeenCalledWith({ userId: "member-1", organizationId: "org-1", role: "finance_manager" });
    expect(adminService.createUserOrganization).not.toHaveBeenCalled();
  });

  it("provides a self-service company setup link without granting access", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { onClose, onSaved } = show();
    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "self_setup" } });
    expect(screen.getByLabelText("Organization setup link")).toHaveValue(`${window.location.origin}/workspace?kind=company`);
    expect(screen.getByText(/identity verification.*admin approval/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copy setup link" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Link copied" })).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/workspace?kind=company`);
    expect(adminService.createUserOrganization).not.toHaveBeenCalled();
    expect(adminService.assignOrganizationMember).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("cancel does not mutate accounts", () => {
    const { onClose } = show();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(adminService.createUserOrganization).not.toHaveBeenCalled();
    expect(adminService.assignOrganizationMember).not.toHaveBeenCalled();
  });
});
