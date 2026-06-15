import { Capacitor } from '@capacitor/core'

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

/** Status bar + browser chrome to match light/dark theme (native + PWA). */
export async function syncNativeTheme(theme = 'light') {
  const isDark = theme === 'dark'
  const bg = isDark ? '#0F2922' : '#FFFFFF'
  const themeColor = isDark ? '#0F2922' : '#0F2922'

  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor)

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
}
