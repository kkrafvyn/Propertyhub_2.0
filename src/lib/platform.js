import { Capacitor } from '@capacitor/core'

/** True when running inside a Capacitor native shell (iOS / Android). */
export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

/** True when installed as a home-screen / Add to Home Screen PWA. */
export function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true
  // Legacy iOS Safari
  if (typeof navigator !== 'undefined' && navigator.standalone === true) return true
  return false
}

/** Show animated launch splash (native app or installed PWA). */
export function shouldShowLaunchSplash() {
  return isNativeApp() || isStandalonePwa()
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
