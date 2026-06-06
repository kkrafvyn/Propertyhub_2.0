/**
 * Smart Device Service
 * Handles IoT device-related reads and writes through Supabase.
 */

import { supabase } from '../lib/supabase'

export const smartDeviceService = {
  // Devices
  async getDevices(propertyId) {
    let query = supabase
      .from('smart_devices')
      .select('*')
      .order('created_at', { ascending: false })

    if (propertyId) query = query.eq('property_id', propertyId)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getDevice(deviceId) {
    const { data, error } = await supabase
      .from('smart_devices')
      .select('*')
      .eq('id', deviceId)
      .single()

    if (error) throw error
    return data
  },

  async createDevice(deviceData) {
    const { data, error } = await supabase
      .from('smart_devices')
      .insert([deviceData])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateDevice(deviceId, deviceData) {
    const { data, error } = await supabase
      .from('smart_devices')
      .update(deviceData)
      .eq('id', deviceId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteDevice(deviceId) {
    const { error } = await supabase
      .from('smart_devices')
      .delete()
      .eq('id', deviceId)

    if (error) throw error
  },

  // Device Commands
  async sendCommand(deviceId, action, parameters = {}) {
    const { data, error } = await supabase.rpc('execute_device_command', {
      device_id: deviceId,
      command_data: { action, parameters },
    })

    if (error) throw error
    return data
  },

  lockDevice(deviceId) {
    return this.sendCommand(deviceId, 'lock')
  },

  unlockDevice(deviceId) {
    return this.sendCommand(deviceId, 'unlock')
  },

  turnOn(deviceId) {
    return this.sendCommand(deviceId, 'turn_on')
  },

  turnOff(deviceId) {
    return this.sendCommand(deviceId, 'turn_off')
  },

  setTemperature(deviceId, temperature) {
    return this.sendCommand(deviceId, 'set_temp', { temperature })
  },

  setBrightness(deviceId, brightness) {
    return this.sendCommand(deviceId, 'set_brightness', { brightness })
  },

  setColor(deviceId, color) {
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
  },

  async createRule(ruleData) {
    const { data, error } = await supabase
      .from('smart_automation_rules')
      .insert([ruleData])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateRule(ruleId, ruleData) {
    const { data, error } = await supabase
      .from('smart_automation_rules')
      .update(ruleData)
      .eq('id', ruleId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteRule(ruleId) {
    const { error } = await supabase
      .from('smart_automation_rules')
      .delete()
      .eq('id', ruleId)

    if (error) throw error
  },

  // Alerts
  async getAlerts(propertyId, limit = 100) {
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
        },
        callback
      )
      .subscribe()
  },

  subscribeToAlerts(propertyId, callback) {
    return supabase
      .channel(`alerts:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_alerts',
          filter: `property_id=eq.${propertyId}`,
        },
        callback
      )
      .subscribe()
  },

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
