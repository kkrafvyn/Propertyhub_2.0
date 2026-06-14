const CACHE = 'baytmiftah-v2'
const PRECACHE = ['/', '/manifest.webmanifest', '/brand/app-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
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
