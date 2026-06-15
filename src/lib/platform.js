import { Capacitor } from '@capacitor/core'

/** True when running inside a Capacitor native shell (iOS / Android). */
export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

/** @returns {'ios' | 'android' | 'web'} */
export function getNativePlatform() {
  return Capacitor.getPlatform()
}

/** Mobile UI in native app and narrow viewports on web. */
export function shouldUseMobileShell() {
  if (isNativeApp()) return true
  if (typeof window === 'undefined') return false
  return window.matchMedia('(max-width: 1023px)').matches
}
