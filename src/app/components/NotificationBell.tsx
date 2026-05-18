import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell } from "lucide-react";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  communicationService,
  type NotificationRecord,
} from "../../lib/communication.service";
import { WORKSPACE_ENTRY_PATH } from "../../lib/workspace";

interface NotificationBellProps {
  userId: string;
}

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

export function NotificationBell({ userId }: NotificationBellProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUnreadCount = async () => {
    try {
      const unreadCount = await communicationService.getUnreadCount(userId);
      setCount(unreadCount);
    } catch (error) {
      console.error("Failed to load unread notifications:", error);
    }
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [unreadCount, history] = await Promise.all([
        communicationService.getUnreadCount(userId),
        communicationService.getNotificationHistory(userId, 5),
      ]);

      setCount(unreadCount);
      setNotifications(history);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUnreadCount();
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    void loadNotifications();
  }, [open, userId]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const handleSelectNotification = async (notification: NotificationRecord) => {
    try {
      if (!notification.read) {
        await communicationService.markAsRead(notification.id);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  read: true,
                  read_at: new Date().toISOString(),
                }
              : item
          )
        );
        setCount((current) => Math.max(0, current - 1));
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setOpen(false);
      navigate(notification.action_url || `${WORKSPACE_ENTRY_PATH}?next=notifications`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await communicationService.markAllAsRead(userId);
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read: true,
          read_at: item.read_at || new Date().toISOString(),
        }))
      );
      setCount(0);
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 hover:bg-secondary rounded-full transition-colors"
          type="button"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-primary text-primary-foreground rounded-full text-[10px] font-semibold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(calc(100vw-2rem),360px)] p-0">
        <div className="px-4 py-3 flex items-center justify-between">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {count > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => void handleMarkAllAsRead()}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground text-center">
            You&apos;re all caught up.
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="items-start px-4 py-3"
              onSelect={(event) => {
                event.preventDefault();
                void handleSelectNotification(notification);
              }}
            >
              <div className="flex w-full items-start gap-3">
                <div className="pt-1">
                  <span
                    className={`block w-2.5 h-2.5 rounded-full ${
                      notification.read ? "bg-border" : "bg-primary"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-5">{notification.subject || "Notification"}</p>
                    <Badge variant={notification.read ? "outline" : "default"}>
                      {notification.read ? "Read" : "New"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {notification.content || "Open BaytMiftah to see the latest update."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="justify-center py-3"
          onSelect={(event) => {
            event.preventDefault();
            setOpen(false);
            navigate(`${WORKSPACE_ENTRY_PATH}?next=notifications`);
          }}
        >
          Open notification settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
