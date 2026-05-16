import { mobileAppService } from "./mobile-app.service";
import { mobileNativeService } from "./mobile-native.service";

function decodeBase64Url(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

export const pushNotificationService = {
  isSupported() {
    return (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );
  },

  async registerBrowserPush(userId: string) {
    if (!this.isSupported()) {
      throw new Error("Browser push is not supported in this environment.");
    }

    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    if (!vapidPublicKey) {
      throw new Error("Missing VITE_WEB_PUSH_PUBLIC_KEY for browser push.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    const existingSubscription = await registration.pushManager.getSubscription();

    const subscription =
      existingSubscription ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeBase64Url(vapidPublicKey),
      }));

    const device = await mobileAppService.registerDevice(
      userId,
      mobileAppService.getBrowserDeviceId(),
      "web",
      "web",
      navigator.userAgent
    );

    const subscriptionJson = subscription.toJSON();
    const endpoint = subscription.endpoint;

    if (!device?.id || !endpoint) {
      throw new Error("Unable to persist the push subscription.");
    }

    await mobileAppService.subscribeToPushNotifications(device.id, endpoint, {
      p256dh: subscriptionJson.keys?.p256dh,
      auth: subscriptionJson.keys?.auth,
    });

    return subscription;
  },

  async registerPush(userId: string, options: { onOpenUrl?: (url: string) => void } = {}) {
    if (mobileNativeService.isNative()) {
      return mobileNativeService.registerNativePush(userId, options.onOpenUrl);
    }

    const subscription = await this.registerBrowserPush(userId);
    return {
      status: "registered" as const,
      endpoint: subscription.endpoint,
    };
  },
};
