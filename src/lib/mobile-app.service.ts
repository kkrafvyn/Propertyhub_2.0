import { supabase } from './supabase'

export const mobileAppService = {
  // Register device
  async registerDevice(
    userId: string,
    deviceId: string,
    deviceType: 'ios' | 'android' | 'web',
    appVersion: string,
    osVersion: string
  ) {
    const { data, error } = await supabase
      .from('mobile_devices')
      .upsert({
        user_id: userId,
        device_id: deviceId,
        device_type: deviceType,
        app_version: appVersion,
        os_version: osVersion,
        last_active_at: new Date().toISOString()
      }, { onConflict: 'device_id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get user devices
  async getUserDevices(userId: string) {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Update device activity
  async updateDeviceActivity(deviceId: string) {
    const { data, error } = await supabase
      .from('mobile_devices')
      .update({ last_active_at: new Date().toISOString() })
      .eq('device_id', deviceId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Subscribe to push notifications
  async subscribeToPushNotifications(
    deviceId: string,
    subscriptionEndpoint: string,
    subscriptionKey: string | { p256dh?: string; auth?: string; keys?: { p256dh?: string; auth?: string } }
  ) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .insert({
        device_id: deviceId,
        subscription_endpoint: subscriptionEndpoint,
        subscription_key:
          typeof subscriptionKey === 'string'
            ? subscriptionKey
            : JSON.stringify(subscriptionKey),
        active: true
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  getBrowserDeviceId() {
    if (typeof window === 'undefined') {
      return ''
    }

    const existing = window.localStorage.getItem('propertyhub-browser-device-id')
    if (existing) return existing

    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `browser-${Date.now()}`

    window.localStorage.setItem('propertyhub-browser-device-id', nextId)
    return nextId
  },

  // Get push subscriptions for device
  async getPushSubscriptions(deviceId: string) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('device_id', deviceId)
      .eq('active', true)
    
    if (error) throw error
    return data
  },

  // Unsubscribe from push notifications
  async unsubscribeFromPushNotifications(subscriptionId: string) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .update({ active: false })
      .eq('id', subscriptionId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get app version info
  async getAppVersion(deviceType: 'ios' | 'android') {
    const appVersion = import.meta.env.VITE_APP_VERSION || '0.0.1'
    const minimumVersion = import.meta.env.VITE_APP_MIN_VERSION || appVersion
    const latestVersion = import.meta.env.VITE_APP_LATEST_VERSION || appVersion
    const iosUrl = import.meta.env.VITE_IOS_APP_URL || ''
    const androidUrl = import.meta.env.VITE_ANDROID_APP_URL || ''

    return {
      current_version: appVersion,
      minimum_version: minimumVersion,
      latest_version: latestVersion,
      force_update: import.meta.env.VITE_APP_FORCE_UPDATE === 'true',
      update_url: deviceType === 'ios' ? iosUrl : androidUrl,
      changelog: import.meta.env.VITE_APP_CHANGELOG || null,
    }
  },

  // Check for app updates
  async checkForUpdates(deviceType: 'ios' | 'android', currentVersion: string) {
    const versionInfo = await this.getAppVersion(deviceType)
    if (!versionInfo) {
      return {
        update_available: false,
        force_update: false,
        changelog: null,
        download_url: null
      }
    }
    
    const current = this.parseVersion(currentVersion)
    const latest = this.parseVersion(versionInfo.latest_version)
    
    return {
      update_available: latest > current,
      force_update: versionInfo.force_update,
      changelog: versionInfo.changelog || null,
      download_url: versionInfo.update_url
    }
  },

  // Parse version string
  parseVersion(version: string): number {
    const [major, minor, patch] = version.split('.').map(Number)
    return (major || 0) * 10000 + (minor || 0) * 100 + (patch || 0)
  },

  // Get app analytics
  async getAppAnalytics(userId: string, days = 30) {
    const { data: devices } = await supabase
      .from('mobile_devices')
      .select('*')
      .eq('user_id', userId)
    
    if (!devices) return null
    
    const thirtyDaysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const activeDevices = devices.filter(d => 
      new Date(d.last_active_at) > thirtyDaysAgo
    )
    
    return {
      total_devices: devices.length,
      active_devices: activeDevices.length,
      ios_devices: devices.filter(d => d.device_type === 'ios').length,
      android_devices: devices.filter(d => d.device_type === 'android').length,
      average_app_version: devices.length > 0 
        ? devices[0].app_version 
        : 'unknown'
    }
  },

  // Remote logout
  async remoteLogout(deviceId: string) {
    const { error } = await supabase
      .from('mobile_devices')
      .delete()
      .eq('device_id', deviceId)
    
    if (error) throw error
  },

  // Wipe device
  async wipeDevice(deviceId: string) {
    // Mark for remote wipe in production
    const { error } = await supabase
      .from('mobile_devices')
      .update({ 
        last_active_at: new Date().toISOString()
        // In production: add wipe_requested flag
      })
      .eq('device_id', deviceId)
    
    if (error) throw error
  }
}
