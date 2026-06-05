import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useSmartDeviceStore = create((set, get) => ({
  // State
  devices: [],
  currentDevice: null,
  automationRules: [],
  alerts: [],
  eventLogs: [],
  loading: false,
  error: null,
  wsConnected: false,

  // Device Actions
  setCurrentDevice: (device) => set({ currentDevice: device }),

  fetchDevices: async (propertyId) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .from('smart_devices')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ devices: data || [] })

      // Subscribe to real-time updates
      get().subscribeToDevices(propertyId)

      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching devices:', error)
    } finally {
      set({ loading: false })
    }
  },

  fetchDeviceById: async (deviceId) => {
    try {
      const { data, error } = await supabase
        .from('smart_devices')
        .select('*')
        .eq('id', deviceId)
        .single()

      if (error) throw error
      set({ currentDevice: data })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching device:', error)
    }
  },

  addDevice: async (propertyId, deviceData) => {
    set({ loading: true, error: null })
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('smart_devices')
        .insert([
          {
            property_id: propertyId,
            owner_id: user.id,
            ...deviceData,
            status: 'online',
            paired_at: new Date().toISOString(),
          },
        ])
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        devices: [...state.devices, data],
      }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error adding device:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateDevice: async (deviceId, deviceData) => {
    try {
      const { data, error } = await supabase
        .from('smart_devices')
        .update(deviceData)
        .eq('id', deviceId)
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        devices: state.devices.map((d) =>
          d.id === deviceId ? data : d
        ),
        currentDevice: state.currentDevice?.id === deviceId ? data : state.currentDevice,
      }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error updating device:', error)
      throw error
    }
  },

  deleteDevice: async (deviceId) => {
    try {
      const { error } = await supabase
        .from('smart_devices')
        .delete()
        .eq('id', deviceId)

      if (error) throw error
      set((state) => ({
        devices: state.devices.filter((d) => d.id !== deviceId),
        currentDevice: state.currentDevice?.id === deviceId ? null : state.currentDevice,
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error deleting device:', error)
      throw error
    }
  },

  // Device Control
  sendCommand: async (deviceId, command) => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await supabase
        .rpc('execute_device_command', {
          device_id: deviceId,
          command_data: command,
        })

      if (error) throw error

      // Update device status
      await get().updateDevice(deviceId, { last_command_at: new Date().toISOString() })

      // Log the event
      await get().logEvent(deviceId, 'command', command)

      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error sending command:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateDeviceStatus: (deviceId, status) => {
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, ...status } : d
      ),
      currentDevice: state.currentDevice?.id === deviceId
        ? { ...state.currentDevice, ...status }
        : state.currentDevice,
    }))
  },

  // Automation Rules
  fetchAutomationRules: async (propertyId) => {
    try {
      const { data, error } = await supabase
        .from('smart_automation_rules')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })

      if (error) throw error
      set({ automationRules: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching automation rules:', error)
    }
  },

  createRule: async (propertyId, ruleData) => {
    set({ loading: true, error: null })
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('smart_automation_rules')
        .insert([
          {
            property_id: propertyId,
            owner_id: user.id,
            ...ruleData,
            enabled: true,
          },
        ])
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        automationRules: [...state.automationRules, data],
      }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error creating rule:', error)
      throw error
    } finally {
      set({ loading: false })
    }
  },

  updateRule: async (ruleId, ruleData) => {
    try {
      const { data, error } = await supabase
        .from('smart_automation_rules')
        .update(ruleData)
        .eq('id', ruleId)
        .select()
        .single()

      if (error) throw error
      set((state) => ({
        automationRules: state.automationRules.map((r) =>
          r.id === ruleId ? data : r
        ),
      }))
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error updating rule:', error)
      throw error
    }
  },

  deleteRule: async (ruleId) => {
    try {
      const { error } = await supabase
        .from('smart_automation_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error
      set((state) => ({
        automationRules: state.automationRules.filter((r) => r.id !== ruleId),
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error deleting rule:', error)
      throw error
    }
  },

  // Alerts
  fetchAlerts: async (propertyId) => {
    try {
      const { data, error } = await supabase
        .from('smart_alerts')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      set({ alerts: data || [] })

      // Subscribe to new alerts
      get().subscribeToAlerts(propertyId)

      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching alerts:', error)
    }
  },

  dismissAlert: async (alertId) => {
    try {
      const { error } = await supabase
        .from('smart_alerts')
        .update({ dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId)

      if (error) throw error
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== alertId),
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error dismissing alert:', error)
    }
  },

  // Event Logs
  fetchEventLogs: async (deviceId, limit = 100) => {
    try {
      const { data, error } = await supabase
        .from('smart_device_logs')
        .select('*')
        .eq('device_id', deviceId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      set({ eventLogs: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching event logs:', error)
    }
  },

  logEvent: async (deviceId, eventType, eventData) => {
    try {
      const { data, error } = await supabase
        .from('smart_device_logs')
        .insert([
          {
            device_id: deviceId,
            event_type: eventType,
            event_data: eventData,
          },
        ])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error logging event:', error)
    }
  },

  // Real-time Subscriptions
  subscribeToDevices: (propertyId) => {
    const subscription = supabase
      .channel(`devices:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'smart_devices',
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            set((state) => ({
              devices: [payload.new, ...state.devices],
            }))
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              devices: state.devices.map((d) =>
                d.id === payload.new.id ? payload.new : d
              ),
            }))
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              devices: state.devices.filter((d) => d.id !== payload.old.id),
            }))
          }
        }
      )
      .subscribe()

    return subscription
  },

  subscribeToAlerts: (propertyId) => {
    const subscription = supabase
      .channel(`alerts:${propertyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'smart_alerts',
          filter: `property_id=eq.${propertyId}`,
        },
        (payload) => {
          set((state) => ({
            alerts: [payload.new, ...state.alerts],
          }))
        }
      )
      .subscribe()

    return subscription
  },

  clearError: () => set({ error: null }),
  reset: () =>
    set({
      devices: [],
      currentDevice: null,
      automationRules: [],
      alerts: [],
      eventLogs: [],
      loading: false,
      error: null,
      wsConnected: false,
    }),
}))
