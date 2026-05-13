import { useEffect, useState } from "react";
import { Bell, Mail, MessageSquare, Smartphone, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/badge";
import {
  communicationService,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferencesSettings,
  type NotificationRecord,
} from "../../../lib/communication.service";
import { pushNotificationService } from "../../../lib/push-notification.service";
import { WORKSPACE_ENTRY_PATH } from "../../../lib/workspace";

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently";

  const diffMs = new Date(value).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [registeringPush, setRegisteringPush] = useState(false);
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [formData, setFormData] = useState<NotificationPreferencesSettings>({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [preferences, notifications] = await Promise.all([
        communicationService.getNotificationPreferences(user.id),
        communicationService.getNotificationHistory(user.id, 20),
      ]);

      setFormData(preferences);
      setHistory(notifications);
    } catch (error) {
      console.error("Failed to load notification settings:", error);
      toast.error("We couldn't load your notification settings right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      await communicationService.updateNotificationPreferences(user.id, formData);
      toast.success("Notification settings saved.");
    } catch (error) {
      console.error("Failed to save notification settings:", error);
      toast.error("We couldn't save your notification settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!user) return;

    try {
      setSendingTest(true);
      const notification = await communicationService.createInAppNotification({
        userId: user.id,
        notificationType: "test_notification",
        subject: "Notification center is working",
        content: "Your in-app notifications are now live in Property Hub.",
        actionUrl: `${WORKSPACE_ENTRY_PATH}?next=notifications`,
      });

      if (!notification) {
        toast.info("In-app notifications are currently disabled in your preferences.");
        return;
      }

      toast.success("Test notification sent.");
      await loadData();
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast.error("We couldn't send a test notification.");
    } finally {
      setSendingTest(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;

    try {
      setMarkingAllRead(true);
      await communicationService.markAllAsRead(user.id);
      setHistory((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
          read_at: notification.read_at || new Date().toISOString(),
        }))
      );
      toast.success("All notifications marked as read.");
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
      toast.error("We couldn't update your notifications.");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleMarkOneAsRead = async (notificationId: string) => {
    try {
      await communicationService.markAsRead(notificationId);
      setHistory((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true,
                read_at: new Date().toISOString(),
              }
            : notification
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast.error("We couldn't update that notification.");
    }
  };

  const handleRegisterBrowserPush = async () => {
    if (!user) return;

    try {
      setRegisteringPush(true);
      await pushNotificationService.registerBrowserPush(user.id);
      toast.success("Browser push connected.");
    } catch (error) {
      console.error("Failed to register browser push:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn't connect browser push notifications."
      );
    } finally {
      setRegisteringPush(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading notifications...</div>;
  }

  if (!user) {
    return <div className="text-center py-12 text-muted-foreground">Sign in to manage notifications.</div>;
  }

  const unreadCount = history.filter((notification) => !notification.read).length;
  const channels = [
    {
      id: "email",
      name: "Email notifications",
      icon: Mail,
      description: "Save your email preference for listing, message, and team updates.",
      key: "email_enabled" as const,
    },
    {
      id: "sms",
      name: "SMS notifications",
      icon: MessageSquare,
      description: "Save your SMS preference for urgent deal and inquiry updates.",
      key: "sms_enabled" as const,
    },
    {
      id: "push",
      name: "Push notifications",
      icon: Bell,
      description: "Use in-app and browser alert preferences for faster response times.",
      key: "push_enabled" as const,
    },
    {
      id: "whatsapp",
      name: "WhatsApp messages",
      icon: Smartphone,
      description: "Keep your WhatsApp delivery preference on file for future rollout.",
      key: "whatsapp_enabled" as const,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            In-app notifications are live now, and external delivery can run through the configured
            email, SMS, WhatsApp, and push providers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge variant={unreadCount > 0 ? "default" : "outline"}>
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </Badge>
          <Button
            variant="outline"
            onClick={() => void handleSendTest()}
            disabled={sendingTest}
          >
            <TestTube2 className="w-4 h-4" />
            {sendingTest ? "Sending..." : "Send Test"}
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-secondary/20 border-dashed">
        <p className="text-sm text-muted-foreground">
          Quiet hours and frequency rules apply to real-time delivery. In-app items still remain in
          your notification center so nothing gets lost.
        </p>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Notification Channels</h2>
        <div className="grid gap-4">
          {channels.map((channel) => {
            const Icon = channel.icon;
            const enabled = formData[channel.key];

            return (
              <Card key={channel.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-secondary rounded-lg">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{channel.name}</h3>
                      <p className="text-sm text-muted-foreground">{channel.description}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          [channel.key]: event.target.checked,
                        }))
                      }
                      className="w-4 h-4 rounded"
                      aria-label={`Toggle ${channel.name}`}
                    />
                    <Badge variant={enabled ? "default" : "secondary"}>
                      {enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </label>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="p-4 border-dashed">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Browser Push Setup</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect this browser to receive real-time push alerts when the workspace sends them.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void handleRegisterBrowserPush()}
            disabled={!pushNotificationService.isSupported() || registeringPush}
          >
            {registeringPush ? "Connecting..." : "Enable Browser Push"}
          </Button>
        </div>
        {!pushNotificationService.isSupported() && (
          <p className="text-xs text-muted-foreground mt-3">
            Browser push is only available in supported secure browser environments.
          </p>
        )}
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Notification Frequency</h2>
        <Card className="p-4">
          <div className="space-y-3">
            {(["immediate", "daily", "weekly", "never"] as const).map((frequency) => (
              <label key={frequency} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="notification_frequency"
                  value={frequency}
                  checked={formData.notification_frequency === frequency}
                  onChange={() =>
                    setFormData((current) => ({
                      ...current,
                      notification_frequency: frequency,
                    }))
                  }
                  className="w-4 h-4"
                />
                <div>
                  <span className="font-medium capitalize">{frequency}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {frequency === "immediate" && "Use real-time delivery for supported channels."}
                    {frequency === "daily" && "Bundle external channel delivery into a daily rhythm."}
                    {frequency === "weekly" && "Keep external updates to a weekly digest."}
                    {frequency === "never" &&
                      "Turn off scheduled delivery preferences. Active conversation updates can still appear in-app."}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Quiet Hours</h2>
        <Card className="p-4 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.quiet_hours_enabled}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  quiet_hours_enabled: event.target.checked,
                }))
              }
              className="w-4 h-4"
            />
            <span className="font-medium">Enable quiet hours</span>
          </label>

          {formData.quiet_hours_enabled && (
            <div className="grid md:grid-cols-2 gap-4 pl-7">
              <div>
                <label htmlFor="quiet-hours-start" className="text-sm font-medium">
                  Start Time
                </label>
                <input
                  id="quiet-hours-start"
                  type="time"
                  value={formData.quiet_hours_start || "22:00"}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      quiet_hours_start: event.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label htmlFor="quiet-hours-end" className="text-sm font-medium">
                  End Time
                </label>
                <input
                  id="quiet-hours-end"
                  type="time"
                  value={formData.quiet_hours_end || "08:00"}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      quiet_hours_end: event.target.value,
                    }))
                  }
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Quiet hours pause time-sensitive delivery channels such as SMS, push, and WhatsApp.
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Recent Notifications</h2>
            <p className="text-sm text-muted-foreground">
              Your in-app center keeps recent deal, team, and messaging activity in one place.
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => void handleMarkAllAsRead()}
              disabled={markingAllRead}
            >
              {markingAllRead ? "Updating..." : "Mark All Read"}
            </Button>
          )}
        </div>

        <Card className="p-4">
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No notifications yet. Send yourself a test notification to verify the center is
              working.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() =>
                    !notification.read
                      ? void handleMarkOneAsRead(notification.id)
                      : undefined
                  }
                  className="w-full text-left p-4 border rounded-lg hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">
                          {notification.subject || "Notification"}
                        </p>
                        <Badge variant="outline" className="uppercase tracking-wide">
                          {notification.channel || "in_app"}
                        </Badge>
                        {!notification.read && <Badge>New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {notification.content || "Open Property Hub to review the update."}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(notification.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void handleSave()} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <Button variant="outline" size="lg" onClick={() => void loadData()}>
          Reset
        </Button>
      </div>
    </div>
  );
}
