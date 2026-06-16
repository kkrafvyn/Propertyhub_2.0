import { useCallback, useEffect, useRef, useState } from 'react'
import { haversineKm } from '../lib/geo-distance'

const STORAGE_KEY = 'baytmiftah_user_location'
const MAX_AGE_MS = 30 * 60 * 1000
const MIN_MOVE_KM = 0.05
const MIN_UPDATE_MS = 10000

function readCached() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.lat == null || parsed?.lng == null || Date.now() - parsed.at > MAX_AGE_MS) return null
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
export function useUserLocation({ watch = false, autoRestore = true } = {}) {
  const watchId = useRef(null)
  const lastUpdateAt = useRef(0)
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
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude
    const accuracy = pos.coords.accuracy
    const now = Date.now()

    setState((prev) => {
      if (
        prev.lat != null &&
        prev.lng != null &&
        live &&
        now - lastUpdateAt.current < MIN_UPDATE_MS &&
        haversineKm(prev.lat, prev.lng, lat, lng) < MIN_MOVE_KM
      ) {
        return prev
      }

      lastUpdateAt.current = now
      const next = {
        status: 'granted',
        lat,
        lng,
        accuracy,
        error: null,
        live,
      }
      writeCache(next)
      return next
    })
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
