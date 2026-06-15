const CACHE = 'baytmiftah-v3'
const RUNTIME = 'baytmiftah-runtime-v3'
const PRECACHE = ['/', '/explore', '/saved', '/manifest.webmanifest', '/brand/app-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'PRECACHE_URLS' || !event.data.urls?.length) return
  event.waitUntil(
    caches.open(RUNTIME).then((cache) =>
      Promise.allSettled(event.data.urls.map((url) => cache.add(url).catch(() => {}))),
    ),
  )
})

function isListingImage(url) {
  return /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes('unsplash.com')
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)

  if (url.origin !== self.location.origin) {
    if (isListingImage(url.href)) {
      event.respondWith(
        caches.open(RUNTIME).then(async (cache) => {
          const cached = await cache.match(event.request)
          const network = fetch(event.request)
            .then((res) => {
              if (res.ok) cache.put(event.request, res.clone())
              return res
            })
            .catch(() => cached)
          return cached || network
        }),
      )
    }
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok && (url.pathname === '/' || url.pathname === '/explore' || url.pathname === '/saved')) {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return res
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))),
  )
})

self.addEventListener('push', (event) => {
  let data = { title: 'BaytMiftah', body: 'You have a new notification' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch { /* use defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/brand/app-icon.svg',
      badge: '/brand/app-icon.svg',
      data: data.link ? { url: data.link } : {},
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin))
      if (existing) {
        existing.focus()
        if (url !== '/') existing.navigate(url)
        return
      }
      return self.clients.openWindow(url)
    }),
  )
})
