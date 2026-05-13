import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NotificationSettings from "./NotificationSettings";
import { useAuth } from "../../context/AuthContext";
import { communicationService } from "../../../lib/communication.service";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../lib/communication.service", () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    in_app_enabled: true,
    whatsapp_enabled: false,
    notification_frequency: "daily",
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
  },
  communicationService: {
    getNotificationPreferences: vi.fn(),
    getNotificationHistory: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    createInAppNotification: vi.fn(),
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

vi.mock("../../../lib/push-notification.service", () => ({
  pushNotificationService: {
    isSupported: vi.fn(() => false),
    registerBrowserPush: vi.fn(),
  },
}));

const useAuthMock = vi.mocked(useAuth);
const getNotificationPreferencesMock = vi.mocked(
  communicationService.getNotificationPreferences
);
const getNotificationHistoryMock = vi.mocked(
  communicationService.getNotificationHistory
);
const updateNotificationPreferencesMock = vi.mocked(
  communicationService.updateNotificationPreferences
);
const createInAppNotificationMock = vi.mocked(
  communicationService.createInAppNotification
);

function createAuthState() {
  return {
    user: {
      id: "user-1",
      email: "agent@example.com",
      user_metadata: {
        full_name: "Agent Example",
      },
    },
    loading: false,
    error: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  };
}

describe("NotificationSettings", () => {
  it("loads the signed-in user's preferences and saves notification_frequency", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);
    getNotificationPreferencesMock.mockResolvedValue({
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
      whatsapp_enabled: false,
      notification_frequency: "daily",
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "08:00",
    } as any);
    getNotificationHistoryMock.mockResolvedValue([]);
    updateNotificationPreferencesMock.mockResolvedValue({} as any);

    render(<NotificationSettings />);
    const user = userEvent.setup();

    expect(await screen.findByText("Notifications")).toBeInTheDocument();
    expect(getNotificationPreferencesMock).toHaveBeenCalledWith("user-1");

    await user.click(screen.getByRole("radio", { name: /weekly/i }));
    await user.click(screen.getByRole("button", { name: /save settings/i }));

    await waitFor(() => {
      expect(updateNotificationPreferencesMock).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          notification_frequency: "weekly",
        })
      );
    });
  });

  it("can send a test notification for the current user", async () => {
    useAuthMock.mockReturnValue(createAuthState() as any);
    getNotificationPreferencesMock.mockResolvedValue({
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
      whatsapp_enabled: false,
      notification_frequency: "daily",
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "08:00",
    } as any);
    getNotificationHistoryMock.mockResolvedValue([]);
    createInAppNotificationMock.mockResolvedValue({ id: "notification-1" } as any);

    render(<NotificationSettings />);
    const user = userEvent.setup();

    expect(await screen.findByText("Notifications")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /send test/i }));

    await waitFor(() => {
      expect(createInAppNotificationMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          notificationType: "test_notification",
        })
      );
    });
  });
});
