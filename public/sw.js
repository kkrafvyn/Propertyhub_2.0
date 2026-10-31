const CACHE_NAME = "baytmiftah-v5-favicon";

/** Static shell only — never cache Vite hashed bundles under /assets/. */
const APP_SHELL = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/icons/favicon-32.png",
  "/icons/favicon-48.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve(false)))))
      .then(() => self.clients.claim()),
  );
});

function isHashedBuildAsset(pathname) {
  return pathname.startsWith("/assets/");
}

function isOfflineShellAsset(pathname) {
  return pathname.startsWith("/icons/");
}

function hasExpectedAssetContentType(request, response) {
  const type = (response.headers.get("content-type") || "").toLowerCase();
  if (type.includes("text/html")) {
    return false;
  }

  if (request.destination === "script" || pathnameEndsWith(request.url, ".js")) {
    return type.includes("javascript") || type.includes("ecmascript");
  }

  if (request.destination === "style" || pathnameEndsWith(request.url, ".css")) {
    return type.includes("css");
  }

  return true;
}

function pathnameEndsWith(url, suffix) {
  try {
    return new URL(url).pathname.endsWith(suffix);
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Hashed Vite chunks must always use the network — SW must not intercept deploy-sensitive assets.
  if (isHashedBuildAsset(url.pathname)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(async () => {
        const cachedShell = await caches.match("/index.html");
        return cachedShell || caches.match("/");
      }),
    );
    return;
  }

  if (!isOfflineShellAsset(url.pathname)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && hasExpectedAssetContentType(event.request, response)) {
          const responseClone = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response("", {
          status: 504,
          statusText: "Offline",
        });
      }),
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "BaytMiftah";
  const body = data.body || "You have a new update.";
  const targetUrl = data.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: {
        url: targetUrl,
      },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client);

      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
