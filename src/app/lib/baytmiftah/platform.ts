import { PHONE_MEDIA } from "../viewports";

export function isNativeApp() {
  return typeof window !== "undefined" && Boolean((window as { Capacitor?: unknown }).Capacitor);
}

export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function shouldShowLaunchSplash() {
  return isNativeApp() || isStandalonePwa();
}

export function shouldUseMobileShell() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(PHONE_MEDIA).matches || isNativeApp();
}
