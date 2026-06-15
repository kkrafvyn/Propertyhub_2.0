const RELOAD_KEY = 'baytmiftah-chunk-reload'

function reloadOnceForStaleChunks() {
  const last = sessionStorage.getItem(RELOAD_KEY)
  const now = Date.now()
  if (last && now - Number(last) < 15000) return false
  sessionStorage.setItem(RELOAD_KEY, String(now))
  window.location.reload()
  return true
}

function isStaleChunkError(reason) {
  const message = reason?.message || String(reason || '')
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  )
}

export function installChunkReloadRecovery() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    reloadOnceForStaleChunks()
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (!isStaleChunkError(event.reason)) return
    event.preventDefault()
    reloadOnceForStaleChunks()
  })
}
