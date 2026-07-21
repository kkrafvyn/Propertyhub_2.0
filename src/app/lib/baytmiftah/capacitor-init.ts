export function dismissHtmlSplash() {
  if (typeof document === "undefined") return;
  document.getElementById("pwa-splash")?.remove();
}

export async function hideNativeSplash() {
  /* Native splash handled by Capacitor when @capacitor/splash-screen is installed */
}

export function scheduleNativeSplashFallback() {
  window.setTimeout(() => {
    void hideNativeSplash();
  }, 4000);
}

export function syncNativeTheme(_theme: string) {
  /* optional native theme sync */
}
