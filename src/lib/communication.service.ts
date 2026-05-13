import { supabase } from "./supabase";
import type { Database } from "./database.types";

type NotificationPreferencesRow =
  Database["public"]["Tables"]["notification_preferences"]["Row"];
type NotificationPreferencesInsert =
  Database["public"]["Tables"]["notification_preferences"]["Insert"];
type NotificationPreferencesUpdate =
  Database["public"]["Tables"]["notification_preferences"]["Update"];
type NotificationLogRow = Database["public"]["Tables"]["notification_logs"]["Row"];
type NotificationLogInsert =
  Database["public"]["Tables"]["notification_logs"]["Insert"];

export type NotificationChannel = NonNullable<NotificationLogRow["channel"]>;
export type NotificationFrequency = NotificationPreferencesRow["notification_frequency"];
export type NotificationPreferencesSettings = Pick<
  NotificationPreferencesRow,
  | "email_enabled"
  | "sms_enabled"
  | "push_enabled"
  | "in_app_enabled"
  | "whatsapp_enabled"
  | "notification_frequency"
  | "quiet_hours_enabled"
  | "quiet_hours_start"
  | "quiet_hours_end"
>;
export type NotificationRecord = NotificationLogRow;

interface SendNotificationOptions {
  actorUserId?: string;
  conversationId?: string;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface CreateInAppNotificationOptions extends SendNotificationOptions {
  userId: string;
  notificationType: string;
  subject: string;
  content: string;
  respectPreferences?: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesSettings = {
  email_enabled: true,
  sms_enabled: false,
  push_enabled: true,
  in_app_enabled: true,
  whatsapp_enabled: false,
  notification_frequency: "daily",
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
};

function getHourFromTime(value?: string | null) {
  if (!value) return null;

  const hour = Number.parseInt(value.split(":")[0] || "", 10);
  return Number.isNaN(hour) ? null : hour;
}

function isQuietHoursActive(
  preferences: NotificationPreferencesSettings,
  now = new Date()
) {
  if (!preferences.quiet_hours_enabled) return false;

  const start = getHourFromTime(preferences.quiet_hours_start);
  const end = getHourFromTime(preferences.quiet_hours_end);

  if (start === null || end === null) return false;

  const currentHour = now.getHours();

  if (start === end) return false;
  if (start < end) {
    return currentHour >= start && currentHour < end;
  }

  return currentHour >= start || currentHour < end;
}

function isChannelEnabled(
  channel: NotificationChannel,
  preferences: NotificationPreferencesSettings
) {
  switch (channel) {
    case "email":
      return preferences.email_enabled;
    case "sms":
      return preferences.sms_enabled;
    case "push":
      return preferences.push_enabled;
    case "in_app":
      return preferences.in_app_enabled;
    case "whatsapp":
      return preferences.whatsapp_enabled;
    default:
      return false;
  }
}

function shouldAttemptChannel(
  channel: NotificationChannel,
  preferences: NotificationPreferencesSettings
) {
  if (!isChannelEnabled(channel, preferences)) return false;
  if (preferences.notification_frequency === "never") return false;

  if (
    preferences.notification_frequency !== "immediate" &&
    channel !== "in_app"
  ) {
    return false;
  }

  if (
    isQuietHoursActive(preferences) &&
    (channel === "sms" || channel === "push" || channel === "whatsapp")
  ) {
    return false;
  }

  return true;
}

function buildNotificationInsert(
  params: CreateInAppNotificationOptions
): NotificationLogInsert {
  return {
    user_id: params.userId,
    actor_user_id: params.actorUserId || null,
    conversation_id: params.conversationId || null,
    notification_type: params.notificationType,
    channel: "in_app",
    subject: params.subject,
    content: params.content,
    action_url: params.actionUrl || null,
    metadata: params.metadata || null,
    delivered: true,
    delivered_at: new Date().toISOString(),
    read: false,
  };
}

async function getUserContactInfo(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("email, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export const communicationService = {
  async dispatchExternalNotification(notificationId: string) {
    const { data, error } = await supabase.functions.invoke("dispatch-notification", {
      body: {
        notificationId,
      },
    });

    if (error) {
      console.error("Failed to dispatch external notification:", error);
      return false;
    }

    return !!data?.success;
  },

  async getNotificationPreferences(userId: string) {
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(data || {}),
    } as NotificationPreferencesSettings;
  },

  async updateNotificationPreferences(
    userId: string,
    preferences: NotificationPreferencesUpdate
  ) {
    const payload: NotificationPreferencesInsert = {
      user_id: userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...preferences,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createInAppNotification(options: CreateInAppNotificationOptions) {
    if (options.respectPreferences !== false) {
      const preferences = await this.getNotificationPreferences(options.userId);
      if (!shouldAttemptChannel("in_app", preferences)) {
        return null;
      }
    }

    const { data, error } = await supabase
      .from("notification_logs")
      .insert(buildNotificationInsert(options))
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async sendNotification(
    userId: string,
    channels: NotificationChannel[],
    notificationType: string,
    subject: string,
    content: string,
    options: SendNotificationOptions = {}
  ) {
    const preferences = await this.getNotificationPreferences(userId);
    const uniqueChannels = Array.from(new Set(channels));
    const results: Array<{
      channel: NotificationChannel;
      success: boolean;
      skipped?: boolean;
      notificationId?: string;
    }> = [];

    for (const channel of uniqueChannels) {
      if (!shouldAttemptChannel(channel, preferences)) {
        results.push({ channel, success: false, skipped: true });
        continue;
      }

      if (channel === "in_app") {
        const notification = await this.createInAppNotification({
          userId,
          notificationType,
          subject,
          content,
          actorUserId: options.actorUserId,
          conversationId: options.conversationId,
          actionUrl: options.actionUrl,
          metadata: options.metadata,
          respectPreferences: false,
        });

        results.push({
          channel,
          success: !!notification,
          notificationId: notification?.id,
        });
        continue;
      }

      const { data, error } = await supabase
        .from("notification_logs")
        .insert({
          user_id: userId,
          actor_user_id: options.actorUserId || null,
          conversation_id: options.conversationId || null,
          notification_type: notificationType,
          channel,
          subject,
          content,
          action_url: options.actionUrl || null,
          metadata: options.metadata || null,
          delivered: false,
          read: false,
        })
        .select()
        .single();

      if (error) throw error;

      const sent = await this.sendViaChannel(channel, data.id, userId, subject, content);

      if (sent) {
        await supabase
          .from("notification_logs")
          .update({
            delivered: true,
            delivered_at: new Date().toISOString(),
          })
          .eq("id", data.id);
      }

      results.push({
        channel,
        success: sent,
        notificationId: data.id,
      });
    }

    return results;
  },

  async sendViaChannel(
    channel: Exclude<NotificationChannel, "in_app">,
    notificationId: string,
    userId: string,
    subject: string,
    content: string
  ) {
    try {
      switch (channel) {
        case "email":
          return await this.sendEmail(notificationId, userId, subject, content);
        case "sms":
          return await this.sendSMS(notificationId, userId, content);
        case "push":
          return await this.sendPushNotification(notificationId, userId, subject, content);
        case "whatsapp":
          return await this.sendWhatsApp(notificationId, userId, content);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
      return false;
    }
  },

  async sendEmail(
    notificationId: string,
    userId: string,
    subject: string,
    content: string
  ): Promise<boolean> {
    const user = await getUserContactInfo(userId);
    if (!user?.email) return false;
    return this.dispatchExternalNotification(notificationId);
  },

  async sendSMS(
    notificationId: string,
    userId: string,
    content: string
  ): Promise<boolean> {
    const user = await getUserContactInfo(userId);
    if (!user?.phone) return false;
    return this.dispatchExternalNotification(notificationId);
  },

  async sendPushNotification(
    notificationId: string,
    userId: string,
    title: string,
    body: string
  ): Promise<boolean> {
    return this.dispatchExternalNotification(notificationId);
  },

  async sendWhatsApp(
    notificationId: string,
    userId: string,
    message: string
  ): Promise<boolean> {
    const user = await getUserContactInfo(userId);
    if (!user?.phone) return false;
    return this.dispatchExternalNotification(notificationId);
  },

  async getNotificationHistory(userId: string, limit = 50) {
    const { data, error } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async getUnreadNotifications(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from("notification_logs")
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("id", notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from("notification_logs")
      .update({
        read: true,
        read_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from("notification_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("read", false);

    if (error) throw error;
    return count || 0;
  },
};

export { DEFAULT_NOTIFICATION_PREFERENCES };
