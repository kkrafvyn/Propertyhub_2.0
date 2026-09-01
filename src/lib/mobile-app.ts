import { Capacitor } from "@capacitor/core";

export type MobileAppId = "consumer" | "business";

const MOBILE_APP_IDS: MobileAppId[] = ["consumer", "business"];

export function getMobileAppId(): MobileAppId {
  const configuredApp = import.meta.env.VITE_MOBILE_APP;
  if (MOBILE_APP_IDS.includes(configuredApp as MobileAppId)) {
    return configuredApp as MobileAppId;
  }

  if (typeof window !== "undefined" && !Capacitor.isNativePlatform()) {
    const appParam = new URLSearchParams(window.location.search).get("app");
    if (MOBILE_APP_IDS.includes(appParam as MobileAppId)) {
      return appParam as MobileAppId;
    }
  }

  return "consumer";
}

export function isBusinessMobileApp(): boolean {
  return getMobileAppId() === "business";
}

export function isConsumerMobileApp(): boolean {
  return getMobileAppId() === "consumer";
}
