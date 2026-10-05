import { pushNotificationService } from "../../../lib/push-notification.service";
import { nativePushAvailable } from "../../../lib/communications-capabilities";

export type PushEnableResult =
  | { ok: true; configured: true }
  | { ok: false; reason: string };

export function isPushEnableFailure(
  result: PushEnableResult,
): result is { ok: false; reason: string } {
  return result.ok === false;
}

export async function enableBrowserPush(userId: string): Promise<PushEnableResult> {
  if (!userId) {
    return { ok: false, reason: "Sign in to enable notifications." };
  }

  try {
    const result = await pushNotificationService.registerBrowserPush(userId);
    if (result.configured === false) {
      return { ok: false, reason: result.reason };
    }
    return { ok: true, configured: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Unable to enable browser push.",
    };
  }
}

/** @deprecated Use enableBrowserPush — permission alone does not register web push. */
export async function requestPushPermission(): Promise<PushEnableResult> {
  if (!("Notification" in window)) {
    return { ok: false, reason: "Notifications are not supported in this browser." };
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Notification permission was not granted." };
  }
  return { ok: false, reason: "Permission granted; complete setup from account settings with push configured." };
}

export async function registerPushToken(_token: string) {
  if (!nativePushAvailable()) {
    return { ok: false as const, reason: "Native push is not configured for this build." };
  }
  return { ok: false as const, reason: "Native token registration is not enabled yet." };
}
