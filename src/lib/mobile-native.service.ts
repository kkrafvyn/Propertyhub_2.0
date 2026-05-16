import { App, type URLOpenListenerEvent } from "@capacitor/app";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Keyboard } from "@capacitor/keyboard";
import {
  PushNotifications,
  type ActionPerformed,
  type PushNotificationSchema,
  type Token,
} from "@capacitor/push-notifications";
import { mobileAppService } from "./mobile-app.service";

type Cleanup = () => void;
type NativePushStatus = "registered" | "denied" | "unsupported" | "failed";

function isNative() {
  return Capacitor.isNativePlatform();
}

function getNotificationUrl(notification?: PushNotificationSchema | null) {
  const data = notification?.data || {};
  return data.url || data.action_url || notification?.link || "/";
}

export const mobileNativeService = {
  isNative,

  async impact() {
    if (!isNative()) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics are a nice-to-have; never block the user flow.
    }
  },

  async registerCurrentDevice(userId: string) {
    const [deviceId, deviceInfo, appInfo] = await Promise.all([
      Device.getId(),
      Device.getInfo(),
      App.getInfo().catch(() => ({
        version: "web",
        build: "web",
        name: "BaytMiftah",
        id: "com.baytmiftah.app",
      })),
    ]);

    return mobileAppService.registerDevice(
      userId,
      deviceId.identifier || mobileAppService.getBrowserDeviceId(),
      deviceInfo.platform,
      appInfo.version,
      `${deviceInfo.operatingSystem} ${deviceInfo.osVersion}`.trim()
    );
  },

  async registerNativePush(
    userId: string,
    onOpenUrl?: (url: string) => void
  ): Promise<{ status: NativePushStatus; token?: string; error?: string }> {
    if (!isNative()) {
      return { status: "unsupported" };
    }

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") {
      return { status: "denied" };
    }

    const device = await this.registerCurrentDevice(userId);

    const registration = new Promise<Token>((resolve, reject) => {
      let registrationHandle: PluginListenerHandle | undefined;
      let errorHandle: PluginListenerHandle | undefined;

      void PushNotifications.addListener("registration", (token) => {
        void registrationHandle?.remove();
        void errorHandle?.remove();
        resolve(token);
      }).then((handle) => {
        registrationHandle = handle;
      });

      void PushNotifications.addListener("registrationError", (error) => {
        void registrationHandle?.remove();
        void errorHandle?.remove();
        reject(new Error(error.error || "Native push registration failed."));
      }).then((handle) => {
        errorHandle = handle;
      });
    });

    try {
      await PushNotifications.register();
      const token = await registration;

      await mobileAppService.subscribeToPushNotifications(device.id, `native:${token.value}`, {
        provider: Capacitor.getPlatform() === "ios" ? "apns" : "fcm",
        token: token.value,
      });

      if (onOpenUrl) {
        await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
          onOpenUrl(getNotificationUrl(event.notification));
        });
      }

      return { status: "registered", token: token.value };
    } catch (error) {
      return {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },

  async watchPushOpens(onOpenUrl: (url: string) => void): Promise<Cleanup> {
    if (!isNative()) return () => undefined;

    const handle = await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (event: ActionPerformed) => {
        onOpenUrl(getNotificationUrl(event.notification));
      }
    );

    return () => {
      void handle.remove();
    };
  },

  async watchDeepLinks(onOpenUrl: (url: string) => void): Promise<Cleanup> {
    if (!isNative()) return () => undefined;

    const launchUrl = await App.getLaunchUrl();
    if (launchUrl?.url) {
      onOpenUrl(launchUrl.url);
    }

    const handle = await App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
      onOpenUrl(event.url);
    });

    return () => {
      void handle.remove();
    };
  },

  async watchKeyboardInset(onChange: (height: number) => void): Promise<Cleanup> {
    if (!isNative()) return () => undefined;

    const showHandle = await Keyboard.addListener("keyboardWillShow", (info) => {
      onChange(info.keyboardHeight);
    });
    const hideHandle = await Keyboard.addListener("keyboardWillHide", () => {
      onChange(0);
    });

    return () => {
      void showHandle.remove();
      void hideHandle.remove();
    };
  },
};
