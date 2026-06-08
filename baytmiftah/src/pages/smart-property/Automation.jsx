import { useEffect, useState } from 'react'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

const starterRules = [
  {
    id: 'starter-entry-lighting',
    name: 'Entry lighting after motion',
    trigger: 'motion_detected',
    action: 'turn_on',
    enabled: true,
    description: 'Turn foyer lights on when motion is detected near the entry.',
  },
  {
    id: 'starter-night-lock',
    name: 'Night security lock',
    trigger: 'time',
    action: 'lock',
    enabled: true,
    description: 'Lock exterior doors during the overnight security window.',
  },
  {
    id: 'starter-temperature',
    name: 'Comfort cooling threshold',
    trigger: 'temp_above',
    action: 'set_temp',
    enabled: false,
    description: 'Adjust cooling when the property gets warmer than 28C.',
  },
]

const blankRule = {
  name: '',
  trigger: 'motion_detected',
  action: 'turn_on',
  triggerDevice: '',
  actionDevice: '',
  enabled: true,
}

export default function Automation() {
  const {
    automationRules,
    fetchAutomationRules,
    createRule,
    updateRule,
    deleteRule,
    loading,
  } = useSmartDeviceStore()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState(blankRule)

  useEffect(() => {
    const propertyId = localStorage.getItem('currentPropertyId') || 'default'
    fetchAutomationRules(propertyId)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const propertyId = localStorage.getItem('currentPropertyId') || 'default'
      await createRule(propertyId, formData)
      setFormData(blankRule)
      setShowForm(false)
    } catch (error) {
      console.error('Error creating rule:', error)
    }
  }

  const handleToggle = async (ruleId, currentEnabled) => {
    try {
      await updateRule(ruleId, { enabled: !currentEnabled })
    } catch (error) {
      console.error('Error updating rule:', error)
    }
  }

  const useStarterRule = (rule) => {
    setFormData({
      name: rule.name,
      trigger: rule.trigger,
      action: rule.action,
      triggerDevice: '',
      actionDevice: '',
      enabled: rule.enabled,
    })
    setShowForm(true)
  }

  const visibleRules = automationRules.length > 0 ? automationRules : starterRules
  const usingStarters = automationRules.length === 0

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-display-md font-bold">Automation Rules</h1>
          <p className="mt-2 text-on-surface-variant">
            Build IF/THEN rules for access, comfort, energy, and safety routines.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-6 py-2 text-white transition hover:bg-primary/90"
        >
          New Rule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-lg bg-surface-container p-6">
          <div>
            <label className="mb-2 block text-body-md font-medium">Rule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Motion Detection"
              className="w-full rounded-lg border border-gray-600 bg-surface px-4 py-2 text-white placeholder-gray-400"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-body-md font-medium">IF Trigger</label>
              <select
                value={formData.trigger}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-surface px-4 py-2 text-white"
              >
                <option value="motion_detected">Motion Detected</option>
                <option value="door_unlocked">Door Unlocked</option>
                <option value="temp_above">Temperature Above 28C</option>
                <option value="temp_below">Temperature Below 18C</option>
                <option value="time">Time Based</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-body-md font-medium">THEN Action</label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className="w-full rounded-lg border border-gray-600 bg-surface px-4 py-2 text-white"
              >
                <option value="turn_on">Turn On</option>
                <option value="turn_off">Turn Off</option>
                <option value="lock">Lock</option>
                <option value="unlock">Unlock</option>
                <option value="set_temp">Set Temperature</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg border border-gray-600 px-4 py-2 hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {visibleRules.map((rule) => (
          <div key={rule.id} className="rounded-lg bg-surface-container p-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div className="flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-body-lg font-medium">{rule.name}</h3>
                  {usingStarters && (
                    <span className="rounded-full bg-primary/20 px-3 py-1 text-label-sm font-bold text-primary">
                      Template
                    </span>
                  )}
                </div>
                <p className="mb-3 text-body-sm text-on-surface-variant">
                  <span className="font-medium">IF</span> {rule.trigger.replace('_', ' ')}{' '}
                  <span className="font-medium">THEN</span> {rule.action.replace('_', ' ')}
                </p>
                {rule.description && (
                  <p className="max-w-2xl text-body-sm text-on-surface-variant">{rule.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {usingStarters ? (
                  <button
                    onClick={() => useStarterRule(rule)}
                    className="rounded-lg border border-primary px-4 py-2 font-semibold text-primary transition hover:bg-primary/10"
                  >
                    Use template
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggle(rule.id, rule.enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        rule.enabled ? 'bg-primary' : 'bg-gray-700'
                      }`}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          rule.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="px-3 py-1 text-red-400 transition hover:text-red-300"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {usingStarters && (
        <div className="mt-8 rounded-lg border border-primary/40 bg-primary/10 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-body-lg font-bold">Starter templates are ready</h2>
              <p className="mt-1 text-on-surface-variant">
                Pick a template to prefill the rule builder, then connect it to real devices when the smart-device
                tables are live.
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary/90"
            >
              Build custom rule
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
