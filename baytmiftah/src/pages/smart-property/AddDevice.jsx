import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

export default function AddDevice() {
  const navigate = useNavigate()
  const { addDevice, loading, error } = useSmartDeviceStore()
  const [step, setStep] = useState(1)
  const [deviceData, setDeviceData] = useState({
    name: '',
    type: 'smart_lock',
    brand: '',
    model: '',
    serialNumber: '',
    macAddress: '',
  })

  const deviceTypes = [
    { value: 'smart_lock', label: '🔒 Smart Lock', description: 'Door access control' },
    { value: 'camera', label: '📷 Camera', description: 'Security monitoring' },
    { value: 'light', label: '💡 Light', description: 'Lighting control' },
    { value: 'sensor', label: '🌡️ Sensor', description: 'Motion/temperature' },
    { value: 'thermostat', label: '🌡️ Thermostat', description: 'Climate control' },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setDeviceData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const propertyId = localStorage.getItem('currentPropertyId') || 'default'
      await addDevice(propertyId, deviceData)
      navigate('/smart-property/devices')
    } catch (err) {
      console.error('Error adding device:', err)
    }
  }

  return (
    <div className="min-h-screen bg-surface p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-surface-container rounded-lg p-8">
          <h1 className="text-display-md font-bold mb-2">Add Smart Device</h1>
          <p className="text-on-surface-variant mb-8">
            Step {step} of 4 - {step === 1 ? 'Device Type' : step === 2 ? 'Details' : step === 3 ? 'Connection' : 'Confirmation'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Device Type */}
            {step === 1 && (
              <div className="grid md:grid-cols-2 gap-4">
                {deviceTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setDeviceData({ ...deviceData, type: type.value })}
                    className={`p-6 rounded-lg border-2 transition text-left ${
                      deviceData.type === type.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <h3 className="text-body-lg font-medium mb-1">{type.label}</h3>
                    <p className="text-on-surface-variant text-body-sm">{type.description}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-body-md font-medium mb-2">Device Name</label>
                  <input
                    type="text"
                    name="name"
                    value={deviceData.name}
                    onChange={handleChange}
                    placeholder="e.g., Front Door Lock"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-md font-medium mb-2">Brand</label>
                    <input
                      type="text"
                      name="brand"
                      value={deviceData.brand}
                      onChange={handleChange}
                      placeholder="e.g., SmartLock Pro"
                      className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-body-md font-medium mb-2">Model</label>
                    <input
                      type="text"
                      name="model"
                      value={deviceData.model}
                      onChange={handleChange}
                      placeholder="e.g., SL-2024"
                      className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Connection */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-body-md font-medium mb-2">Serial Number</label>
                  <input
                    type="text"
                    name="serialNumber"
                    value={deviceData.serialNumber}
                    onChange={handleChange}
                    placeholder="Device serial number"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-body-md font-medium mb-2">MAC Address</label>
                  <input
                    type="text"
                    name="macAddress"
                    value={deviceData.macAddress}
                    onChange={handleChange}
                    placeholder="XX:XX:XX:XX:XX:XX"
                    className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <div className="bg-surface rounded-lg p-6 space-y-4">
                <h3 className="text-body-lg font-medium">Review Details</h3>
                <div className="space-y-2 text-body-md">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type</span>
                    <span className="text-white capitalize">{deviceData.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name</span>
                    <span className="text-white">{deviceData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Brand</span>
                    <span className="text-white">{deviceData.brand}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition"
                >
                  Back
                </button>
              )}
              {step < 4 && (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                >
                  Next
                </button>
              )}
              {step === 4 && (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Add Device'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
