import { mobileAppService } from "./mobile-app.service";

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

  canUseLocalNotifications() {
    return typeof window !== "undefined" && "Notification" in window;
  },

  hasWebPushKeys() {
    return !!import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
  },

  getPermission() {
    if (!this.canUseLocalNotifications()) return "denied" as NotificationPermission;
    return Notification.permission;
  },

  async requestPermission() {
    if (!this.canUseLocalNotifications()) return "denied" as NotificationPermission;
    if (Notification.permission === "granted") return "granted";
    return Notification.requestPermission();
  },

  showLocalNotification(input: { title: string; body: string; url?: string }) {
    if (!this.canUseLocalNotifications()) return null;
    if (Notification.permission !== "granted") return null;

    const notification = new Notification(input.title, {
      body: input.body,
      icon: "/icons/icon-192.png",
    });

    if (input.url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = input.url!;
        notification.close();
      };
    }

    return notification;
  },

  async registerBrowserPush(userId: string) {
    if (!this.canUseLocalNotifications()) {
      throw new Error("Browser notifications are not supported in this environment.");
    }

    const permission = await this.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted.");
    }

    const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY;
    if (!vapidPublicKey) {
      this.showLocalNotification({
        title: "BaytMiftah alerts enabled",
        body: "You'll receive in-app notifications and browser alerts while this app is open.",
      });
      return null;
    }

    if (!this.isSupported()) {
      this.showLocalNotification({
        title: "Property Hub alerts enabled",
        body: "In-app notifications are active. Full web push requires a supported browser.",
      });
      return null;
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
};
