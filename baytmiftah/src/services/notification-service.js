import smartDeviceService from './smart-device-service'
import { callEdgeFunction } from './edge-client'

const PREFERENCES_KEY = 'baytmiftah_notification_preferences'

export const defaultNotificationPreferences = {
  email: true,
  sms: false,
  push: true,
  smartAlerts: true,
  leadAlerts: true,
  listingReviews: true,
}

const readLocalUser = () => {
  try {
    return JSON.parse(localStorage.getItem('baytmiftah_user') || 'null')
  } catch {
    return null
  }
}

export function loadLocalNotificationPreferences() {
  try {
    return {
      ...defaultNotificationPreferences,
      ...JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}'),
    }
  } catch {
    return defaultNotificationPreferences
  }
}

export async function getNotificationPreferences() {
  const user = readLocalUser()
  const fallback = loadLocalNotificationPreferences()

  if (!user?.id) return { preferences: fallback, source: 'local' }

  try {
    const remote = await smartDeviceService.getAlertPreferences(user.id)
    const preferences = remote?.preferences || remote || fallback
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    return { preferences: { ...fallback, ...preferences }, source: 'supabase' }
  } catch {
    return { preferences: fallback, source: 'local' }
  }
}

export async function saveNotificationPreferences(preferences) {
  const user = readLocalUser()
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))

  if (!user?.id) return { source: 'local' }

  try {
    await smartDeviceService.updateAlertPreferences(user.id, { preferences })
    return { source: 'supabase' }
  } catch {
    return { source: 'local' }
  }
}

export async function dispatchNotification(payload) {
  try {
    const result = await callEdgeFunction('notifications', {
      method: 'POST',
      query: { action: 'dispatch' },
      body: payload,
    })
    return { ...result, source: 'supabase' }
  } catch (error) {
    return {
      source: 'local',
      notification: {
        title: payload.title,
        body: payload.body || payload.message,
        created_at: new Date().toISOString(),
      },
      deliveries: [],
      error: error.message,
    }
  }
}

export async function listNotifications() {
  try {
    return await callEdgeFunction('notifications', {
      query: { action: 'list' },
    })
  } catch {
    return []
  }
}
