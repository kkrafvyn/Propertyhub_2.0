import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { savePushTokenInDb } from '../lib/supabase-db'

export async function registerPushToken(token, platform = 'web') {
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user && await savePushTokenInDb({ userId: user.id, token, platform })) {
      return { ok: true, source: 'supabase' }
    }
  }
  try {
    localStorage.setItem('baytmiftah_fcm_token', token)
  } catch { /* ignore */ }
  try {
    return await callEdgeFunction('push', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'register', token, platform },
    })
  } catch {
    return { ok: true, source: 'local' }
  }
}

export async function requestPushPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return { ok: false, reason: 'unsupported' }
  }
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { ok: false, reason: perm }

  const reg = await navigator.serviceWorker.ready
  const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY
  if (vapidKey && reg.pushManager) {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
    const token = JSON.stringify(sub.toJSON())
    await registerPushToken(token)
    return { ok: true, token }
  }

  await registerPushToken(`web-${crypto.randomUUID()}`)
  return { ok: true, source: 'demo' }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default { registerPushToken, requestPushPermission }
