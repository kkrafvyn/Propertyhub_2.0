export function openCookiePreferences() {
  window.dispatchEvent(new Event("bm:open-cookie-preferences"));
}
