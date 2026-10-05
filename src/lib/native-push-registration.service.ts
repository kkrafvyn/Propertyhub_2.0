import { Capacitor } from "@capacitor/core";
import { nativePushAvailable } from "./communications-capabilities";
import { mobileAppService } from "./mobile-app.service";

export type NativePushRegistrationResult =
  | { configured: true }
  | { configured: false; reason: string };

/**
 * Registers native device push when Capacitor push plugin and backend FCM are configured.
 * Requires optional dependency @capacitor/push-notifications in native builds.
 */
export async function registerNativeDevicePush(userId: string): Promise<NativePushRegistrationResult> {
  if (!userId) {
    return { configured: false, reason: "Sign in required." };
  }
  if (!nativePushAvailable()) {
    return { configured: false, reason: "Native push is not configured for this environment." };
  }
  if (!Capacitor.isNativePlatform()) {
    return { configured: false, reason: "Native push is only available in the mobile app." };
  }

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") {
      return { configured: false, reason: "Notification permission was not granted." };
    }

    await PushNotifications.register();

    return await new Promise<NativePushRegistrationResult>((resolve) => {
      void PushNotifications.addListener("registration", async (token) => {
        const deviceId = mobileAppService.getBrowserDeviceId() || token.value.slice(0, 32);
        const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";
        await mobileAppService.registerDevice(userId, deviceId, platform, platform, platform);
        await mobileAppService.subscribeToPushNotifications(deviceId, token.value, token.value);
        resolve({ configured: true });
      });

      setTimeout(() => {
        resolve({ configured: false, reason: "Timed out waiting for push registration token." });
      }, 15000);
    });
  } catch {
    return {
      configured: false,
      reason:
        "Native push plugin is not available. Add @capacitor/push-notifications to the mobile build.",
    };
  }
}
