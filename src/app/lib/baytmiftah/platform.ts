import { Capacitor } from "@capacitor/core";
import { PHONE_MEDIA } from "../viewports";

export function isNativeApp() {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/** Launch splash — native apps only (never regular browser / Vercel web). */
export function shouldShowLaunchSplash() {
  return isNativeApp();
}

export function shouldUseMobileShell() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(PHONE_MEDIA).matches || isNativeApp();
}
