import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initAnalytics } from './lib/analytics'
import { installChunkReloadRecovery } from './lib/chunk-reload'
import './index.css'

initAnalytics()
installChunkReloadRecovery()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
