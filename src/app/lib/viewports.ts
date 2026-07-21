/** Phone: single-column shell + bottom nav */
export const PHONE_MAX_WIDTH = 767;

/** Tablet sits between phone and desktop */
export const TABLET_MIN_WIDTH = 768;
export const TABLET_MAX_WIDTH = 1023;

export const DESKTOP_MIN_WIDTH = 1024;

export const PHONE_MEDIA = `(max-width: ${PHONE_MAX_WIDTH}px)`;
export const TABLET_MEDIA = `(min-width: ${TABLET_MIN_WIDTH}px) and (max-width: ${TABLET_MAX_WIDTH}px)`;
export const BELOW_DESKTOP_MEDIA = `(max-width: ${TABLET_MAX_WIDTH}px)`;
export const DESKTOP_MEDIA = `(min-width: ${DESKTOP_MIN_WIDTH}px)`;

export function isPhoneViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(PHONE_MEDIA).matches;
}

export function isTabletViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(TABLET_MEDIA).matches;
}

export function isBelowDesktopViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(BELOW_DESKTOP_MEDIA).matches;
}
