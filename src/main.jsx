import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { initAnalytics } from './lib/analytics'
import { initMonitoring } from './lib/monitoring'
import { hideNativeSplash, initCapacitor } from './lib/capacitor-init'
import { dismissHtmlSplash } from './lib/pwa-splash'
import { shouldShowLaunchSplash } from './lib/platform'
import { installChunkReloadRecovery, clearChunkReloadFlag } from './lib/chunk-reload'
import './index.css'

initAnalytics()
initMonitoring()
installChunkReloadRecovery()
void initCapacitor()

if (Capacitor.isNativePlatform()) {
  dismissHtmlSplash()
} else {
  try {
    const seen = sessionStorage.getItem('baytmiftah.splash.seen') === '1'
    if (!shouldShowLaunchSplash() || seen) {
      dismissHtmlSplash()
    }
  } catch {
    if (!shouldShowLaunchSplash()) dismissHtmlSplash()
  }
}

try {
  const seen = sessionStorage.getItem('baytmiftah.splash.seen') === '1'
  if (Capacitor.isNativePlatform() && seen) {
    void hideNativeSplash()
  }
} catch { /* ignore */ }

if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

clearChunkReloadFlag()
