const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let loaded = false

export function initAnalytics() {
  if (!KEY || loaded || typeof window === 'undefined') return
  loaded = true
  const script = document.createElement('script')
  script.async = true
  script.src = `${HOST}/static/array.js`
  script.onload = () => {
    window.posthog?.init(KEY, { api_host: HOST, person_profiles: 'identified_only' })
  }
  document.head.appendChild(script)
}

export function trackEvent(name, props = {}) {
  if (typeof window !== 'undefined' && window.posthog?.capture) {
    window.posthog.capture(name, props)
  }
}

export default { initAnalytics, trackEvent }
