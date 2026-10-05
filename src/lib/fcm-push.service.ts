/**
 * BaytMiftah REOS — Firebase Cloud Messaging (FCM) Push Service
 * ─────────────────────────────────────────────────────────────
 * Handles background & offline push notifications across Web, Android, and iOS.
 * Integrated with Supabase fcm_device_tokens table.
 */

import { supabase } from "./supabase";

export interface FCMDeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: "web" | "android" | "ios";
  deviceInfo: Record<string, any>;
  isActive: boolean;
}

export interface PushNotificationPayload {
  recipientUserId: string;
  title: string;
  body: string;
  conversationId: string;
  messageId?: string;
  deepLinkUrl?: string;
  badgeCount?: number;
  data?: Record<string, string>;
}

export class FCMPushService {
  private localTokens = new Map<string, FCMDeviceToken[]>();

  /**
   * Register or update an FCM token for a user
   */
  async registerToken(params: {
    userId: string;
    token: string;
    platform: "web" | "android" | "ios";
    deviceInfo?: Record<string, any>;
  }): Promise<void> {
    const list = this.localTokens.get(params.userId) || [];
    const filtered = list.filter((t) => t.token !== params.token);
    filtered.push({
      id: `tok_${Date.now()}`,
      userId: params.userId,
      token: params.token,
      platform: params.platform,
      deviceInfo: params.deviceInfo || {},
      isActive: true,
    });
    this.localTokens.set(params.userId, filtered);

    try {
      await supabase.from("fcm_device_tokens").upsert(
        {
          user_id: params.userId,
          token: params.token,
          platform: params.platform,
          device_info: params.deviceInfo || {},
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token" }
      );
    } catch {
      // Retain the device token locally until server persistence is available.
    }
  }

  /**
   * Deactivate a token upon logout
   */
  async deactivateToken(token: string): Promise<void> {
    try {
      await supabase
        .from("fcm_device_tokens")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("token", token);
    } catch {
      // local cleanup
      for (const [userId, tokens] of this.localTokens.entries()) {
        this.localTokens.set(
          userId,
          tokens.filter((t) => t.token !== token)
        );
      }
    }
  }

  /**
   * @deprecated Use the dispatch-notification edge function from the server.
   * Client-side FCM cannot deliver tokens safely; this method only counts failures.
   */
  async dispatchPushNotification(payload: PushNotificationPayload): Promise<{
    delivered: number;
    failed: number;
  }> {
    let tokens: string[] = [];

    try {
      const { data } = await supabase
        .from("fcm_device_tokens")
        .select("token")
        .eq("user_id", payload.recipientUserId)
        .eq("is_active", true);

      if (data && data.length > 0) {
        tokens = data.map((d) => d.token);
      }
    } catch {
      // offline fallback
    }

    if (tokens.length === 0) {
      const local = this.localTokens.get(payload.recipientUserId) || [];
      tokens = local.filter((t) => t.isActive).map((t) => t.token);
    }

    if (tokens.length === 0) {
      return { delivered: 0, failed: 0 };
    }

    // FCM tokens cannot be delivered safely from a browser client. The active
    // production path is dispatch-notification, which sends Web Push server-side.
    // Report these tokens as failed instead of claiming delivery that never occurred.
    void payload;
    return { delivered: 0, failed: tokens.length };
  }
}

export const fcmPushService = new FCMPushService();
