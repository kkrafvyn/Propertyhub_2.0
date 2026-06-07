/**
 * Smart Device Service
 * Handles IoT device calls through Supabase Edge Functions only.
 */

import { callEdgeFunction } from './edge-client'

const smartRequest = (options = {}) => callEdgeFunction('smart-devices', options)

const inactiveSubscription = () => ({
  unsubscribe() {},
})

export const smartDeviceService = {
  async getDevices(propertyId) {
    return smartRequest({ query: { action: 'list', propertyId } })
  },

  async getDevice(deviceId) {
    return smartRequest({ query: { action: 'get', deviceId } })
  },

  async createDevice(deviceData) {
    return smartRequest({
      method: 'POST',
      query: { action: 'create' },
      body: deviceData,
    })
  },

  async updateDevice(deviceId, deviceData) {
    return smartRequest({
      method: 'PUT',
      query: { action: 'update', deviceId },
      body: deviceData,
    })
  },

  async deleteDevice(deviceId) {
    return smartRequest({
      method: 'DELETE',
      query: { action: 'delete', deviceId },
    })
  },

  async sendCommand(deviceId, action, parameters = {}) {
    return smartRequest({
      method: 'POST',
      query: { action: 'command', deviceId },
      body: { action, parameters },
    })
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

  async getAutomationRules(propertyId) {
    return smartRequest({ query: { action: 'rules', propertyId } })
  },

  async createRule(ruleData) {
    return smartRequest({
      method: 'POST',
      query: { action: 'create-rule' },
      body: ruleData,
    })
  },

  async updateRule(ruleId, ruleData) {
    return smartRequest({
      method: 'PUT',
      query: { action: 'update-rule', ruleId },
      body: ruleData,
    })
  },

  async deleteRule(ruleId) {
    return smartRequest({
      method: 'DELETE',
      query: { action: 'delete-rule', ruleId },
    })
  },

  async getAlerts(propertyId, limit = 100) {
    return smartRequest({ query: { action: 'alerts', propertyId, limit } })
  },

  async getAlert(alertId) {
    return smartRequest({ query: { action: 'alert', alertId } })
  },

  async dismissAlert(alertId) {
    return smartRequest({
      method: 'POST',
      query: { action: 'dismiss-alert', alertId },
    })
  },

  async getAlertsByType(propertyId, alertType) {
    return smartRequest({ query: { action: 'alerts', propertyId, alertType } })
  },

  async getAlertPreferences(userId) {
    return smartRequest({ query: { action: 'alert-preferences', userId } })
  },

  async updateAlertPreferences(userId, preferences) {
    return smartRequest({
      method: 'PUT',
      query: { action: 'alert-preferences', userId },
      body: preferences,
    })
  },

  async getEventLogs(deviceId, limit = 100) {
    return smartRequest({ query: { action: 'logs', deviceId, limit } })
  },

  async getEventLogsByType(deviceId, eventType) {
    return smartRequest({ query: { action: 'logs', deviceId, eventType } })
  },

  async getPropertyEventLogs(propertyId, limit = 50) {
    return smartRequest({ query: { action: 'property-logs', propertyId, limit } })
  },

  async logEvent(deviceId, eventType, eventData) {
    return smartRequest({
      method: 'POST',
      query: { action: 'log-event', deviceId },
      body: { eventType, eventData },
    })
  },

  async getDeviceStatus(deviceId) {
    return smartRequest({ query: { action: 'status', deviceId } })
  },

  async updateDeviceStatus(deviceId, status) {
    return smartRequest({
      method: 'PUT',
      query: { action: 'status', deviceId },
      body: { status },
    })
  },

  async generatePairingCode(deviceType) {
    return smartRequest({
      method: 'POST',
      query: { action: 'generate-pairing-code' },
      body: { deviceType },
    })
  },

  async validatePairingCode(pairingCode) {
    return smartRequest({
      method: 'POST',
      query: { action: 'validate-pairing-code' },
      body: { pairingCode },
    })
  },

  async shareDevice(deviceId, userId, permissions = 'view') {
    return smartRequest({
      method: 'POST',
      query: { action: 'share', deviceId },
      body: { userId, permissions },
    })
  },

  async getSharedDevices(userId) {
    return smartRequest({ query: { action: 'shared', userId } })
  },

  async revokeDeviceAccess(shareId) {
    return smartRequest({
      method: 'DELETE',
      query: { action: 'share', shareId },
    })
  },

  subscribeToDevice() {
    return inactiveSubscription()
  },

  subscribeToAlerts() {
    return inactiveSubscription()
  },

  subscribeToEvents() {
    return inactiveSubscription()
  },
}

export default smartDeviceService
