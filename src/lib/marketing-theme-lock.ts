export const MARKETING_THEME_LOCK_EVENT = "baytmiftah:marketing-theme-lock";

let marketingThemeLocked = false;

export function isMarketingThemeLocked(): boolean {
  return marketingThemeLocked;
}

export function setMarketingThemeLocked(locked: boolean): void {
  marketingThemeLocked = locked;

  if (typeof document !== "undefined") {
    document.documentElement.dataset.marketingTheme = locked ? "locked" : "";
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(MARKETING_THEME_LOCK_EVENT));
  }
}
