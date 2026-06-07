import { create } from 'zustand'
import smartDeviceService from '../services/smart-device-service'

export const useSmartDeviceStore = create((set, get) => ({
  devices: [],
  currentDevice: null,
  automationRules: [],
  alerts: [],
  eventLogs: [],
  loading: false,
  error: null,
  wsConnected: false,

  setCurrentDevice: (device) => set({ currentDevice: device }),

  fetchDevices: async (propertyId) => {
    set({ loading: true, error: null })
    try {
      const data = await smartDeviceService.getDevices(propertyId)
      set({ devices: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching devices:', error)
      return []
    } finally {
      set({ loading: false })
    }
  },

  fetchDeviceById: async (deviceId) => {
    try {
      const data = await smartDeviceService.getDevice(deviceId)
      set({ currentDevice: data })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching device:', error)
      return null
    }
  },

  addDevice: async (propertyId, deviceData) => {
    set({ loading: true, error: null })
    try {
      const data = await smartDeviceService.createDevice({
        property_id: propertyId,
        ...deviceData,
      })
      set((state) => ({ devices: [...state.devices, data] }))
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
      const data = await smartDeviceService.updateDevice(deviceId, deviceData)
      set((state) => ({
        devices: state.devices.map((device) => (device.id === deviceId ? data : device)),
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
      await smartDeviceService.deleteDevice(deviceId)
      set((state) => ({
        devices: state.devices.filter((device) => device.id !== deviceId),
        currentDevice: state.currentDevice?.id === deviceId ? null : state.currentDevice,
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error deleting device:', error)
      throw error
    }
  },

  sendCommand: async (deviceId, command) => {
    set({ loading: true, error: null })
    try {
      return await smartDeviceService.sendCommand(deviceId, command.action || command, command.parameters || {})
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
      devices: state.devices.map((device) =>
        device.id === deviceId ? { ...device, ...status } : device
      ),
      currentDevice:
        state.currentDevice?.id === deviceId ? { ...state.currentDevice, ...status } : state.currentDevice,
    }))
  },

  fetchAutomationRules: async (propertyId) => {
    try {
      const data = await smartDeviceService.getAutomationRules(propertyId)
      set({ automationRules: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching automation rules:', error)
      return []
    }
  },

  createRule: async (propertyId, ruleData) => {
    set({ loading: true, error: null })
    try {
      const data = await smartDeviceService.createRule({
        property_id: propertyId,
        ...ruleData,
      })
      set((state) => ({ automationRules: [...state.automationRules, data] }))
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
      const data = await smartDeviceService.updateRule(ruleId, ruleData)
      set((state) => ({
        automationRules: state.automationRules.map((rule) => (rule.id === ruleId ? data : rule)),
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
      await smartDeviceService.deleteRule(ruleId)
      set((state) => ({
        automationRules: state.automationRules.filter((rule) => rule.id !== ruleId),
      }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error deleting rule:', error)
      throw error
    }
  },

  fetchAlerts: async (propertyId) => {
    try {
      const data = await smartDeviceService.getAlerts(propertyId)
      set({ alerts: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching alerts:', error)
      return []
    }
  },

  dismissAlert: async (alertId) => {
    try {
      await smartDeviceService.dismissAlert(alertId)
      set((state) => ({ alerts: state.alerts.filter((alert) => alert.id !== alertId) }))
    } catch (error) {
      set({ error: error.message })
      console.error('Error dismissing alert:', error)
    }
  },

  fetchEventLogs: async (deviceId, limit = 100) => {
    try {
      const data = await smartDeviceService.getEventLogs(deviceId, limit)
      set({ eventLogs: data || [] })
      return data
    } catch (error) {
      set({ error: error.message })
      console.error('Error fetching event logs:', error)
      return []
    }
  },

  logEvent: async (deviceId, eventType, eventData) => {
    try {
      return await smartDeviceService.logEvent(deviceId, eventType, eventData)
    } catch (error) {
      console.error('Error logging event:', error)
      return null
    }
  },

  subscribeToDevices: () => smartDeviceService.subscribeToDevice(),
  subscribeToAlerts: () => smartDeviceService.subscribeToAlerts(),

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
