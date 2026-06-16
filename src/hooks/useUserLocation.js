import { useCallback, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'baytmiftah_user_location'
const MAX_AGE_MS = 30 * 60 * 1000

function readCached() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.lat || !parsed?.lng || Date.now() - parsed.at > MAX_AGE_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(payload) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, at: Date.now() }))
  } catch { /* ignore */ }
}

function clearCache() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

/**
 * Browser geolocation with optional live watch (Bolt-style).
 * Restores a recent fix from sessionStorage so distance persists across tabs.
 */
export function useUserLocation({ watch = true, autoRestore = true } = {}) {
  const watchId = useRef(null)
  const [state, setState] = useState(() => {
    const cached = autoRestore ? readCached() : null
    if (cached) {
      return {
        status: 'granted',
        lat: cached.lat,
        lng: cached.lng,
        accuracy: cached.accuracy ?? null,
        error: null,
        live: false,
      }
    }
    return { status: 'idle', lat: null, lng: null, accuracy: null, error: null, live: false }
  })

  const applyPosition = useCallback((pos, live = false) => {
    const next = {
      status: 'granted',
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      error: null,
      live,
    }
    writeCache(next)
    setState(next)
  }, [])

  const stopWatch = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, status: 'error', error: 'unsupported' }))
      return
    }
    setState((s) => ({ ...s, status: 'loading', error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        applyPosition(pos, false)
        if (watch) {
          stopWatch()
          watchId.current = navigator.geolocation.watchPosition(
            (p) => applyPosition(p, true),
            () => { /* keep last fix */ },
            { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
          )
        }
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED
        setState({
          status: denied ? 'denied' : 'error',
          lat: null,
          lng: null,
          accuracy: null,
          error: denied ? 'denied' : 'unavailable',
          live: false,
        })
        if (denied) clearCache()
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [applyPosition, stopWatch, watch])

  const clear = useCallback(() => {
    stopWatch()
    clearCache()
    setState({ status: 'idle', lat: null, lng: null, accuracy: null, error: null, live: false })
  }, [stopWatch])

  useEffect(() => () => stopWatch(), [stopWatch])

  return {
    ...state,
    isActive: state.status === 'granted' && state.lat != null,
    request,
    clear,
  }
}

export default useUserLocation
