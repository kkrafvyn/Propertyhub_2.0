import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import ChatThread from "./ChatThread";
const send = vi.hoisted(() => vi.fn());
vi.mock("../../../context/AuthContext", () => ({ useAuth: () => ({ user: { id: "self" }, profile: {} }) }));
vi.mock("../../../i18n/LocaleContext", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../../../hooks/useChatThread", () => ({ useChatScroll: () => ({ current: null }), useChatThread: () => ({ conversation: { messages: [] }, send, sending: false, error: "", live: true, isOwnMessage: () => false }) }));
vi.mock("../../../lib/baytmiftah/messaging-service", () => ({ sendAgentMessage: vi.fn() }));
describe("consumer reply suggestions", () => {
  it("prepares an editable reply and sends only after submit", async () => {
    send.mockResolvedValue(true);
    render(<MemoryRouter><ChatThread conversationId="conversation-1" /></MemoryRouter>);
    const user = userEvent.setup();
    await user.click(screen.getByText("Could we arrange a viewing?"));
    expect(screen.getByLabelText("Message")).toHaveValue("Could we arrange a viewing?");
    expect(send).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "messagesPage.send" }));
    expect(send).toHaveBeenCalledWith("Could we arrange a viewing?");
  });
});
