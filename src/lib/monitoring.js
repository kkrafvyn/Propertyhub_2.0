/** Optional error monitoring — set VITE_SENTRY_DSN to enable */

const DSN = import.meta.env.VITE_SENTRY_DSN

export function initMonitoring() {
  if (!DSN || typeof window === 'undefined') return

  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, { type: 'window.error' })
  })

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { type: 'unhandledrejection' })
  })
}

export function reportError(error, context = {}) {
  if (!DSN) return
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  fetch(`${DSN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      stack,
      context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ts: new Date().toISOString(),
    }),
  }).catch(() => {})
}

export default { initMonitoring, reportError }
