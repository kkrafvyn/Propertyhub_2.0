import { Capacitor } from '@capacitor/core'

const NATIVE_SPLASH_FALLBACK_MS = 5000
let nativeSplashFallbackScheduled = false

/** Hide the native Capacitor splash once the animated splash is ready. */
export async function hideNativeSplash() {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* plugins optional during dev */
  }
}

/** Never leave launchAutoHide:false splash up if JS skips the animated splash. */
export function scheduleNativeSplashFallback() {
  if (!Capacitor.isNativePlatform() || nativeSplashFallbackScheduled) return
  nativeSplashFallbackScheduled = true
  window.setTimeout(() => {
    hideNativeSplash()
  }, NATIVE_SPLASH_FALLBACK_MS)
}

/** Status bar + browser chrome to match light/dark theme (native + PWA). */
export async function syncNativeTheme(theme = 'light') {
  const isDark = theme === 'dark'
  const bg = isDark ? '#0F2922' : '#FFFFFF'
  const themeColor = isDark ? '#0F2922' : '#FFFFFF'

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute('content', isDark ? 'black-translucent' : 'default')

  if (!Capacitor.isNativePlatform()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: isDark ? Style.Light : Style.Dark })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: bg })
    }
  } catch {
    /* plugins optional during dev */
  }
}

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return

  let theme = 'light'
  try {
    theme = localStorage.getItem('baytmiftah_theme') || 'light'
  } catch { /* ignore */ }

  await syncNativeTheme(theme)
  scheduleNativeSplashFallback()

  try {
    if (sessionStorage.getItem('baytmiftah.splash.seen') === '1') {
      await hideNativeSplash()
    }
  } catch { /* ignore */ }
}
