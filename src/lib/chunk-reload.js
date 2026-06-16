const RELOAD_KEY = 'baytmiftah-chunk-reload'

export function isStaleChunkError(reason) {
  const message = reason?.message || String(reason || '')
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('Failed to load module script') ||
    message.includes('dynamically imported module') ||
    /Loading chunk [\w-]+ failed/i.test(message)
  )
}

export function reloadOnceForStaleChunks() {
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === '1') return false
    sessionStorage.setItem(RELOAD_KEY, '1')
  } catch {
    return false
  }
  window.location.reload()
  return true
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch { /* ignore */ }
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
