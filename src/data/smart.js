export const smartPortfolio = {
  building: 'Cantonments Sky Villa',
  devicesOnline: 12,
  devicesTotal: 14,
  automationsActive: 5,
  alertsToday: 3,
  energyToday: '42.8 kWh',
}

export const smartDevices = [
  { id: 'd1', name: 'Front door lock', type: 'lock', location: 'Unit 4B', status: 'online', battery: 78, lastSeen: '2m ago' },
  { id: 'd2', name: 'Lobby camera', type: 'camera', location: 'Ground floor', status: 'online', battery: null, lastSeen: '1m ago' },
  { id: 'd3', name: 'HVAC controller', type: 'climate', location: 'Unit 4B', status: 'online', battery: null, lastSeen: '5m ago' },
  { id: 'd4', name: 'Water leak sensor', type: 'sensor', location: 'Kitchen', status: 'offline', battery: 12, lastSeen: '2h ago' },
  { id: 'd5', name: 'Gate access', type: 'lock', location: 'Compound', status: 'online', battery: 91, lastSeen: '30s ago' },
]

export const automations = [
  { id: 'a1', name: 'Lock doors at midnight', trigger: 'Schedule 00:00', action: 'Lock all units', enabled: true },
  { id: 'a2', name: 'AC eco mode when away', trigger: 'No motion 30min', action: 'Set HVAC to 26°C', enabled: true },
  { id: 'a3', name: 'Alert on leak detected', trigger: 'Water sensor wet', action: 'Notify manager + tenant', enabled: true },
  { id: 'a4', name: 'Welcome lighting', trigger: 'Tenant arrives home', action: 'Lights on + unlock', enabled: false },
]

export const smartAlerts = [
  { id: 'al1', type: 'warning', title: 'Water leak sensor offline', device: 'Kitchen sensor', time: '2026-06-13 09:14', read: false },
  { id: 'al2', type: 'info', title: 'Gate accessed — Daniel K.', device: 'Gate access', time: '2026-06-13 08:42', read: true },
  { id: 'al3', type: 'critical', title: 'Motion detected — lobby after hours', device: 'Lobby camera', time: '2026-06-12 23:05', read: true },
]

export const eventLogs = [
  { id: 'ev1', event: 'Door unlocked', source: 'Front door lock', user: 'Daniel K.', time: '2026-06-13 08:40' },
  { id: 'ev2', event: 'HVAC set to 24°C', source: 'HVAC controller', user: 'Automation', time: '2026-06-13 07:00' },
  { id: 'ev3', event: 'Camera recording started', source: 'Lobby camera', user: 'System', time: '2026-06-12 23:05' },
  { id: 'ev4', event: 'Battery low warning', source: 'Water leak sensor', user: 'System', time: '2026-06-12 18:30' },
]
