import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDeleteAccountDialog } from "./AdminDeleteAccountDialog";
import { adminService, type AdminUserRow } from "../../../lib/admin.service";
vi.mock("../../../lib/admin.service", () => ({ adminService: { deleteAccount: vi.fn() } }));
const user = { id: "user-1", email: "ada@example.com", full_name: "Ada" } as AdminUserRow;
function show() {
  const onClose = vi.fn(); const onChanged = vi.fn().mockResolvedValue(undefined);
  render(<AdminDeleteAccountDialog user={user} onClose={onClose} onChanged={onChanged} />);
  return { onClose, onChanged };
}
describe("admin account deletion", () => {
  beforeEach(() => vi.resetAllMocks());
  it("requires an exact typed confirmation before deletion", async () => {
    vi.mocked(adminService.deleteAccount).mockResolvedValue(undefined);
    const { onClose, onChanged } = show();
    const submit = screen.getByRole("button", { name: "Delete sign-in account" });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type ada/), { target: { value: "wrong@example.com" } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Type ada/), { target: { value: user.email } });
    fireEvent.click(submit);
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(adminService.deleteAccount).toHaveBeenCalledWith(user.id);
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("shows server blockers and refreshes a possibly locked account without closing", async () => {
    vi.mocked(adminService.deleteAccount).mockRejectedValue(new Error("Transfer organization ownership first"));
    const { onClose, onChanged } = show();
    fireEvent.change(screen.getByLabelText(/Type ada/), { target: { value: user.email } });
    fireEvent.click(screen.getByRole("button", { name: "Delete sign-in account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Transfer organization ownership first");
    expect(onChanged).toHaveBeenCalledOnce(); expect(onClose).not.toHaveBeenCalled();
  });
  it("cancellation never deletes the account", () => {
    const { onClose } = show(); fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce(); expect(adminService.deleteAccount).not.toHaveBeenCalled();
  });
});
