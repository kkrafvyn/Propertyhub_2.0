import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SvgIcon } from '../../components/Navigation'
import PropTechShell from '../../components/PropTechShell'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

const deviceTypes = [
  { value: 'smart_lock', label: 'Smart Lock', icon: 'shield', description: 'Door access control' },
  { value: 'camera', label: 'Camera', icon: 'monitoring', description: 'Security monitoring' },
  { value: 'light', label: 'Lighting', icon: 'diamond', description: 'Lighting control' },
  { value: 'sensor', label: 'Sensor', icon: 'devices_other', description: 'Motion and temperature' },
  { value: 'thermostat', label: 'Thermostat', icon: 'home_work', description: 'Climate control' },
]

const stepLabels = {
  1: 'Choose the device type.',
  2: 'Add device details.',
  3: 'Enter connection identifiers.',
  4: 'Review and pair the device.',
}

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

  const handleChange = (event) => {
    const { name, value } = event.target
    setDeviceData((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      const propertyId = localStorage.getItem('currentPropertyId') || 'default'
      await addDevice(propertyId, deviceData)
      navigate('/smart-property/devices')
    } catch (err) {
      console.error('Error adding device:', err)
    }
  }

  return (
    <PropTechShell
      active="Smart Property"
      brand="Pair Smart Device"
      sidebarTitle="PropTech"
      sidebarSubtitle="Agency Command"
      searchPlaceholder="Search devices or units..."
      primaryAction=""
    >
      <main className="px-5 py-8 text-[#071121] md:px-8">
        <div className="mx-auto max-w-3xl">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-[0_12px_32px_rgba(7,17,33,0.06)] md:p-8">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-[#9a7413]">
                  Step {step} of 4
                </p>
                <h1 className="mt-2 text-4xl font-bold">Add Smart Device</h1>
                <p className="mt-2 text-[#596170]">{stepLabels[step]}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/smart-property/devices')}
                className="marketplace-secondary-cta"
              >
                Back to Devices
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {deviceTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setDeviceData((current) => ({ ...current, type: type.value }))}
                      className={`rounded-lg border p-5 text-left transition ${
                        deviceData.type === type.value
                          ? 'border-[#E9C349] bg-[#fff8d7]'
                          : 'border-[#cbd3df] bg-[#f8faff] hover:border-[#071121]'
                      }`}
                    >
                      <SvgIcon name={type.icon} className="h-6 w-6 text-[#9a7413]" />
                      <h3 className="mb-1 mt-4 text-lg font-semibold">{type.label}</h3>
                      <p className="text-sm text-[#596170]">{type.description}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <TextInput
                    label="Device Name"
                    name="name"
                    value={deviceData.name}
                    onChange={handleChange}
                    placeholder="e.g., Front Door Lock"
                    required
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label="Brand"
                      name="brand"
                      value={deviceData.brand}
                      onChange={handleChange}
                      placeholder="e.g., SmartLock Pro"
                    />
                    <TextInput
                      label="Model"
                      name="model"
                      value={deviceData.model}
                      onChange={handleChange}
                      placeholder="e.g., SL-2024"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <TextInput
                    label="Serial Number"
                    name="serialNumber"
                    value={deviceData.serialNumber}
                    onChange={handleChange}
                    placeholder="Device serial number"
                    required
                  />
                  <TextInput
                    label="MAC Address"
                    name="macAddress"
                    value={deviceData.macAddress}
                    onChange={handleChange}
                    placeholder="XX:XX:XX:XX:XX:XX"
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4 rounded-lg border border-[#cbd3df] bg-[#f8faff] p-6">
                  <h3 className="text-lg font-semibold">Review Details</h3>
                  {[
                    ['Type', deviceData.type.replace('_', ' ')],
                    ['Name', deviceData.name || 'Not set'],
                    ['Brand', deviceData.brand || 'Not set'],
                    ['Model', deviceData.model || 'Not set'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-[#596170]">{label}</span>
                      <span className="text-right font-semibold capitalize">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500 bg-red-50 p-4 text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((current) => current - 1)}
                    className="marketplace-secondary-cta flex-1"
                  >
                    Back
                  </button>
                )}
                {step < 4 && (
                  <button
                    type="button"
                    onClick={() => setStep((current) => current + 1)}
                    className="marketplace-cta flex-1"
                  >
                    Next
                  </button>
                )}
                {step === 4 && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="marketplace-cta flex-1 disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Device'}
                  </button>
                )}
              </div>
            </form>
          </section>
        </div>
      </main>
    </PropTechShell>
  )
}

function TextInput({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-2 block font-semibold">{label}</span>
      <input className="input-field bg-[#f8faff] text-[#071121]" {...props} />
    </label>
  )
}
