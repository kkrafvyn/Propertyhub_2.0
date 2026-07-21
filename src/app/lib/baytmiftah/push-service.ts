import { pushNotificationService } from "../../../lib/push-notification.service";

export async function requestPushPermission() {
  try {
    if (!("Notification" in window)) return { ok: false };
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function registerPushToken(_token: string) {
  return { ok: true };
}
