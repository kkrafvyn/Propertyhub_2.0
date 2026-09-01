export type MobileAppId = "consumer" | "business";

const MOBILE_APP_IDS: MobileAppId[] = ["consumer", "business"];

export function getMobileAppId(): MobileAppId {
  if (typeof window !== "undefined") {
    const appParam = new URLSearchParams(window.location.search).get("app");
    if (MOBILE_APP_IDS.includes(appParam as MobileAppId)) {
      return appParam as MobileAppId;
    }
  }

  const configuredApp = import.meta.env.VITE_MOBILE_APP;
  return MOBILE_APP_IDS.includes(configuredApp as MobileAppId)
    ? (configuredApp as MobileAppId)
    : "consumer";
}

export function isBusinessMobileApp(): boolean {
  return getMobileAppId() === "business";
}
