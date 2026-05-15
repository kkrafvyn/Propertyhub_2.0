import { supabase } from './supabase'

type AppPlatform = 'ios' | 'android'

type AppVersionInfo = {
  current_version: string
  minimum_version: string
  latest_version: string
  force_update: boolean
  update_url: string
}

const DEFAULT_APP_RELEASES: Record<AppPlatform, AppVersionInfo> = {
  ios: {
    current_version: '1.0.0',
    minimum_version: '1.0.0',
    latest_version: '1.0.1',
    force_update: false,
    update_url: 'https://apps.apple.com/app/propertyhub',
  },
  android: {
    current_version: '1.0.0',
    minimum_version: '1.0.0',
    latest_version: '1.0.1',
    force_update: false,
    update_url: 'https://play.google.com/store/apps/details?id=com.propertyhub',
  },
}

function envValue(key: string) {
  const env = import.meta.env as Record<string, string | undefined>
  return env[key]
}

function buildEnvRelease(platform: AppPlatform): Partial<AppVersionInfo> {
  const prefix = platform === 'ios' ? 'VITE_IOS_APP' : 'VITE_ANDROID_APP'
  const currentVersion = envValue(`${prefix}_CURRENT_VERSION`)
  const minimumVersion = envValue(`${prefix}_MINIMUM_VERSION`)
  const latestVersion = envValue(`${prefix}_LATEST_VERSION`)
  const updateUrl = envValue(`${prefix}_UPDATE_URL`)
  const forceUpdate = envValue(`${prefix}_FORCE_UPDATE`)

  return {
    current_version: currentVersion,
    minimum_version: minimumVersion,
    latest_version: latestVersion,
    update_url: updateUrl,
    force_update: forceUpdate === 'true',
  }
}

export const mobileAppService = {
  async registerDevice(
    userId: string,
    deviceId: string,
    deviceType: 'ios' | 'android' | 'web',
    appVersion: string,
    osVersion: string
  ) {
    const { data, error } = await supabase
      .from('mobile_devices')
      .upsert(
        {
          user_id: userId,
          device_id: deviceId,
          device_type: deviceType,
          app_version: appVersion,
          os_version: osVersion,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: 'device_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getUserDevices(userId: string) {
    const { data, error } = await supabase
      .from('mobile_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_active_at', { ascending: false })

    if (error) throw error
    return data
  },

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
        active: true,
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

  async getPushSubscriptions(deviceId: string) {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('device_id', deviceId)
      .eq('active', true)

    if (error) throw error
    return data
  },

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

  async getAppVersion(deviceType: AppPlatform) {
    const defaultConfig = DEFAULT_APP_RELEASES[deviceType]
    const envConfig = buildEnvRelease(deviceType)

    let tableConfig: Partial<AppVersionInfo> = {}
    try {
      const { data, error } = await (supabase as any)
        .from('app_release_channels')
        .select('*')
        .eq('platform', deviceType)
        .maybeSingle()

      if (!error && data) {
        tableConfig = {
          current_version: data.current_version,
          minimum_version: data.minimum_version,
          latest_version: data.latest_version,
          force_update: Boolean(data.force_update),
          update_url: data.update_url,
        }
      }
    } catch (error) {
      console.error('App release table unavailable, falling back to env/device data:', error)
    }

    let observedLatestVersion: string | null = null
    try {
      const { data, error } = await supabase
        .from('mobile_devices')
        .select('app_version')
        .eq('device_type', deviceType)
        .not('app_version', 'is', null)

      if (!error && data?.length) {
        observedLatestVersion =
          data
            .map((item) => item.app_version)
            .filter(Boolean)
            .sort((a, b) => this.parseVersion(b) - this.parseVersion(a))[0] || null
      }
    } catch (error) {
      console.error('Failed to inspect observed app versions:', error)
    }

    return {
      ...defaultConfig,
      ...envConfig,
      ...tableConfig,
      latest_version:
        tableConfig.latest_version ||
        envConfig.latest_version ||
        observedLatestVersion ||
        defaultConfig.latest_version,
      current_version:
        tableConfig.current_version ||
        envConfig.current_version ||
        observedLatestVersion ||
        defaultConfig.current_version,
      minimum_version:
        tableConfig.minimum_version ||
        envConfig.minimum_version ||
        defaultConfig.minimum_version,
      force_update:
        typeof tableConfig.force_update === 'boolean'
          ? tableConfig.force_update
          : typeof envConfig.force_update === 'boolean'
            ? envConfig.force_update
            : defaultConfig.force_update,
      update_url:
        tableConfig.update_url ||
        envConfig.update_url ||
        defaultConfig.update_url,
    }
  },

  async checkForUpdates(deviceType: AppPlatform, currentVersion: string) {
    const versionInfo = await this.getAppVersion(deviceType)

    const current = this.parseVersion(currentVersion)
    const latest = this.parseVersion(versionInfo.latest_version)

    return {
      update_available: latest > current,
      force_update: versionInfo.force_update,
      changelog: 'Security updates, smoother field follow-up, and deal room improvements.',
      download_url: versionInfo.update_url,
    }
  },

  parseVersion(version: string): number {
    const [major, minor, patch] = version.split('.').map(Number)
    return (major || 0) * 10000 + (minor || 0) * 100 + (patch || 0)
  },

  async getAppAnalytics(userId: string, days = 30) {
    const { data: devices } = await supabase
      .from('mobile_devices')
      .select('*')
      .eq('user_id', userId)

    if (!devices) return null

    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const activeDevices = devices.filter((device) => new Date(device.last_active_at) > threshold)

    return {
      total_devices: devices.length,
      active_devices: activeDevices.length,
      ios_devices: devices.filter((device) => device.device_type === 'ios').length,
      android_devices: devices.filter((device) => device.device_type === 'android').length,
      average_app_version: devices.length > 0 ? devices[0].app_version : 'unknown',
    }
  },

  async remoteLogout(deviceId: string) {
    const { error } = await supabase
      .from('mobile_devices')
      .delete()
      .eq('device_id', deviceId)

    if (error) throw error
  },

  async wipeDevice(deviceId: string) {
    const { error } = await supabase
      .from('mobile_devices')
      .update({
        last_active_at: new Date().toISOString(),
      })
      .eq('device_id', deviceId)

    if (error) throw error
  },
}
