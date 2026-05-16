import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";
import { communicationService } from "../../lib/communication.service";

vi.mock("../../lib/communication.service", () => ({
  communicationService: {
    getUnreadCount: vi.fn(),
    getNotificationHistory: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const getUnreadCountMock = vi.mocked(communicationService.getUnreadCount);
const getNotificationHistoryMock = vi.mocked(
  communicationService.getNotificationHistory
);
const markAsReadMock = vi.mocked(communicationService.markAsRead);

function renderNotificationBell() {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <NotificationBell userId="user-1" />,
      },
      {
        path: "/app/messages",
        element: <div>Messages Page</div>,
      },
      {
        path: "/workspace",
        element: <div>Workspace Page</div>,
      },
    ],
    {
      initialEntries: ["/"],
    }
  );

  render(<RouterProvider router={router} />);
  return router;
}

describe("NotificationBell", () => {
  it("opens recent notifications and navigates to the notification target", async () => {
    getUnreadCountMock.mockResolvedValue(1);
    getNotificationHistoryMock.mockResolvedValue([
      {
        id: "notification-1",
        user_id: "user-1",
        actor_user_id: "user-2",
        conversation_id: "conversation-1",
        notification_type: "message_received",
        channel: "in_app",
        subject: "New message on BaytMiftah",
        content: "Can we schedule a viewing tomorrow?",
        action_url: "/app/messages",
        metadata: null,
        delivered: true,
        delivered_at: new Date().toISOString(),
        read: false,
        read_at: null,
        created_at: new Date().toISOString(),
      },
    ] as any);
    markAsReadMock.mockResolvedValue({} as any);

    const router = renderNotificationBell();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /notifications/i }));

    expect(await screen.findByText("New message on BaytMiftah")).toBeInTheDocument();

    await user.click(screen.getByText("New message on BaytMiftah"));

    await waitFor(() => {
      expect(markAsReadMock).toHaveBeenCalledWith("notification-1");
      expect(router.state.location.pathname).toBe("/app/messages");
    });
  });
});
