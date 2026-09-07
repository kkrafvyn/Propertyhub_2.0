export function registerAppServiceWorker() {
  if (!import.meta.env.PROD) {
    return;
  }

  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (window.__ELECTRON__ || window.__BAYTMIFTAH_DESKTOP__) {
    return;
  }

  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;

          nextWorker.addEventListener("statechange", () => {
            if (nextWorker.state !== "activated" || !navigator.serviceWorker.controller) {
              return;
            }

            window.location.reload();
          });
        });

        void registration.update();
      })
      .catch((error) => {
        console.error("Failed to register the app service worker:", error);
      });
  });
}
