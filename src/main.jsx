import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import App from './App'
import { initAnalytics } from './lib/analytics'
import { initCapacitor } from './lib/capacitor-init'
import { installChunkReloadRecovery } from './lib/chunk-reload'
import './index.css'

initAnalytics()
installChunkReloadRecovery()
initCapacitor()

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
