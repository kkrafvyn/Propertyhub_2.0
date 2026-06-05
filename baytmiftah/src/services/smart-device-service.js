/**
 * Smart Device Service
 * Handles all IoT device-related API calls to Supabase Edge Functions
 */

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:54321/functions/v1'

const getAuthToken = () => {
  return localStorage.getItem('auth_token')
}

const headers = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
})

export const smartDeviceService = {
  // Devices
  async getDevices(propertyId) {
    const token = getAuthToken()
    let url = `${API_URL}/smart-devices`
    if (propertyId) url += `?propertyId=${propertyId}`
    
    const response = await fetch(url, {
      headers: headers(token),
    })
    if (!response.ok) throw new Error('Failed to fetch devices')
    return response.json()
  },

  async getDevice(deviceId) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/smart-devices/${deviceId}`, {
      headers: headers(token),
    })
    if (!response.ok) throw new Error('Failed to fetch device')
    return response.json()
  },

  async createDevice(deviceData) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/smart-devices`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(deviceData),
    })
    if (!response.ok) throw new Error('Failed to create device')
    return response.json()
  },

  async updateDevice(deviceId, deviceData) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/smart-devices/${deviceId}`, {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify(deviceData),
    })
    if (!response.ok) throw new Error('Failed to update device')
    return response.json()
  },

  async deleteDevice(deviceId) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/smart-devices/${deviceId}`, {
      method: 'DELETE',
      headers: headers(token),
    })
    if (!response.ok) throw new Error('Failed to delete device')
  },

  // Device Commands
  async sendCommand(deviceId, action, parameters = {}) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/smart-devices/command?deviceId=${deviceId}`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ action, parameters }),
    })
    if (!response.ok) throw new Error('Failed to send command')
    return response.json()
  },

  async lockDevice(deviceId) {
    return this.sendCommand(deviceId, 'lock')
  },

  async unlockDevice(deviceId) {
    return this.sendCommand(deviceId, 'unlock')
  },

  async turnOn(deviceId) {
    return this.sendCommand(deviceId, 'turn_on')
  },

  async turnOff(deviceId) {
    return this.sendCommand(deviceId, 'turn_off')
  },

  async setTemperature(deviceId, temperature) {
    return this.sendCommand(deviceId, 'set_temp', { temperature })
  },

  async setBrightness(deviceId, brightness) {
    return this.sendCommand(deviceId, 'set_brightness', { brightness })
  },

  async setColor(deviceId, color) {
    return this.sendCommand(deviceId, 'set_color', { color })
  },

  // Automation Rules
  async getAutomationRules(propertyId) {
    const { data, error } = await supabase
      .from('smart_automation_rules')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },token = getAuthToken()
    let url = `${API_URL}/automation`
    if (propertyId) url += `?propertyId=${propertyId}`
    
    const response = await fetch(url, {
      headers: headers(token),
    })
    if (!response.ok) throw new Error('Failed to fetch automation rules')
    return response.json()
  },

  async createRule(ruleData) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/automation`, {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(ruleData),
    })
    if (!response.ok) throw new Error('Failed to create automation rule')
    return response.json()
  },

  async updateRule(ruleId, ruleData) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/automation/${ruleId}`, {
      method: 'PUT',
      headers: headers(token),
      body: JSON.stringify(ruleData),
    })
    if (!response.ok) throw new Error('Failed to update automation rule')
    return response.json()
  },

  async deleteRule(ruleId) {
    const token = getAuthToken()
    const response = await fetch(`${API_URL}/automation/${ruleId}`, {
      method: 'DELETE',
      headers: headers(token),
    })
    if (!response.ok) throw new Error('Failed to delete automation rule')Id, limit = 100) {
    const { data, error } = await supabase
      .from('smart_alerts')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  async getAlert(alertId) {
    const { data, error } = await supabase
      .from('smart_alerts')
      .select('*')
      .eq('id', alertId)
      .single()

    if (error) throw error
    return data
  },

  async dismissAlert(alertId) {
    const { data, error } = await supabase
      .from('smart_alerts')
      .update({
        dismissed: true,
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAlertsByType(propertyId, alertType) {
    const { data, error } = await supabase
      .from('smart_alerts')
      .select('*')
      .eq('property_id', propertyId)
      .eq('alert_type', alertType)
      .eq('dismissed', false)

    if (error) throw error
    return data
  },

  async getAlertPreferences(userId) {
    const { data, error } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  async updateAlertPreferences(userId, preferences) {
    const { data, error } = await supabase
      .from('alert_preferences')
      .upsert({ user_id: userId, ...preferences })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Event Logs
  async getEventLogs(deviceId, limit = 100) {
    const { data, error } = await supabase
      .from('smart_device_logs')
      .select('*')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  async getEventLogsByType(deviceId, eventType) {
    const { data, error } = await supabase
      .from('smart_device_logs')
      .select('*')
      .eq('device_id', deviceId)
      .eq('event_type', eventType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getPropertyEventLogs(propertyId, limit = 50) {
    const { data, error } = await supabase
      .from('smart_device_logs')
      .select('*, device:device_id(*)')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  async logEvent(deviceId, eventType, eventData) {
    const { data, error } = await supabase
      .from('smart_device_logs')
      .insert([{ device_id: deviceId, event_type: eventType, event_data: eventData }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Device Status
  async getDeviceStatus(deviceId) {
    const { data, error } = await supabase
      .from('smart_devices')
      .select('status, battery_level, signal_strength, last_seen')
      .eq('id', deviceId)
      .single()

    if (error) throw error
    return data
  },

  async updateDeviceStatus(deviceId, status) {
    const { data, error } = await supabase
      .from('smart_devices')
      .update({
        status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', deviceId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Device Pairing
  async generatePairingCode(deviceType) {
    const { data, error } = await supabase.rpc('generate_device_pairing_code', {
      device_type: deviceType,
    })

    if (error) throw error
    return data
  },

  async validatePairingCode(pairingCode) {
    const { data, error } = await supabase.rpc('validate_pairing_code', {
      pairing_code: pairingCode,
    })

    if (error) throw error
    return data
  },

  // Device Permissions
  async shareDevice(deviceId, userId, permissions = 'view') {
    const { data, error } = await supabase
      .from('device_sharing')
      .insert([{ device_id: deviceId, shared_with: userId, permissions }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getSharedDevices(userId) {
    const { data, error } = await supabase
      .from('device_sharing')
      .select('*, device:device_id(*)')
      .eq('shared_with', userId)

    if (error) throw error
    return data
  },

  async revokeDeviceAccess(shareId) {
    const { error } = await supabase
      .from('device_sharing')
      .delete()
      .eq('id', shareId)

    if (error) throw error
  },

  // Real-time Subscriptions
  subscribeToDevice(deviceId, callback) {
    return supabase
      .channel(`device:${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'smart_devices',
          filter: `id=eq.${deviceId}`,
        }, (kept for backward compatibility)
  subscribeToDevice(deviceId, callback) {
    console.log('Subscribe to device:', deviceId)
    // In Edge Functions approach, real-time is handled via Supabase directly
  },

  subscribeToAlerts(userId, callback) {
    console.log('Subscribe to alerts:', userId)
  },

  subscribeToEvents(deviceId, callback) {
    console.log('Subscribe to events:', deviceId)
  },
}

export default smartDeviceService

  subscribeToEvents(deviceId, callback) {
    return supabase
      .channel(`events:${deviceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_device_logs',
          filter: `device_id=eq.${deviceId}`,
        },
        callback
      )
      .subscribe()
  },
}

export default smartDeviceService
