import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { InboxList } from "./InboxList";
vi.mock("../../../i18n/LocaleContext", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
describe("consumer inbox discovery", () => {
  it("combines text search and unread filtering without changing conversations", async () => {
    render(<MemoryRouter><InboxList conversations={[
      { id: "1", participant: "Ama", listingTitle: "East Legon apartment", lastMessage: "Viewing confirmed", unread: 2 },
      { id: "2", participant: "Kojo", listingTitle: "Osu studio", lastMessage: "Available", unread: 0 },
    ]} /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox"), "Osu");
    expect(screen.getByText("Kojo")).toBeTruthy(); expect(screen.queryByText("Ama")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Unread only" }));
    expect(screen.getByRole("status").textContent).toContain("No conversations match");
    await user.clear(screen.getByRole("searchbox"));
    expect(screen.getByText("Ama")).toBeTruthy(); expect(screen.queryByText("Kojo")).toBeNull();
    expect(screen.getByLabelText("2 unread messages")).toBeTruthy();
  });
});
