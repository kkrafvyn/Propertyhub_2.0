export function registerAppServiceWorker() {
  if (!import.meta.env.PROD) {
    return;
  }

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Failed to register the app service worker:", error);
    });
  });
}
