import { Capacitor } from '@capacitor/core'

export async function initCapacitor() {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    const { StatusBar, Style } = await import('@capacitor/status-bar')

    await StatusBar.setStyle({ style: Style.Light })
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0F2922' })
    }

    await SplashScreen.hide()
  } catch {
    /* plugins optional during dev */
  }
}
