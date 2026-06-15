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

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')

    await StatusBar.setStyle({ style: Style.Dark })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
    }
  } catch {
    /* plugins optional during dev */
  }
}
