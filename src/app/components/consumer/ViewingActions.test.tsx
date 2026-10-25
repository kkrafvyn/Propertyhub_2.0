import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ViewingActions } from "./ViewingActions";
const send = vi.hoisted(() => vi.fn());
vi.mock("../../lib/baytmiftah/messaging-service", () => ({ openListingConversation: send }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
describe("viewing requests", () => {
  it("does not present unconfirmed requests as calendar appointments", () => {
    render(<MemoryRouter><ViewingActions viewing={{ id: "1", status: "requested", listing_id: "listing-1" }} /></MemoryRouter>);
    expect(screen.queryByText("Add to calendar")).toBeNull();
    expect(screen.getByText(/Awaiting confirmation/)).toBeTruthy();
  });
  it("sends an explicit rescheduling enquiry without changing confirmed status", async () => {
    send.mockResolvedValue({ conversationId: "conversation-1" });
    const viewing = { id: "2", listing_id: "listing-2", status: "confirmed", confirmed_datetime: "2099-01-01T10:00:00Z" };
    render(<MemoryRouter><ViewingActions viewing={viewing} /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByText("Request a different time"));
    const input = screen.getByLabelText("Preferred date and time");
    // datetime-local inputs are assigned with the input event rather than synthetic typing.
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(input, { target: { value: "2099-01-02T10:00" } });
    await user.click(screen.getByText("Send time-change request"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ listingId: "listing-2", initialMessage: expect.stringContaining("The original appointment remains until confirmed.") }));
    expect(viewing.status).toBe("confirmed");
  });
});
