import { useEffect, useState } from 'react'
import { useSmartDeviceStore } from '../../store/useSmartDeviceStore'

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
  const [formData, setFormData] = useState({
    name: '',
    trigger: 'motion_detected',
    action: 'turn_on',
    triggerDevice: '',
    actionDevice: '',
    enabled: true,
  })

  useEffect(() => {
    const propertyId = localStorage.getItem('currentPropertyId') || 'default'
    fetchAutomationRules(propertyId)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const propertyId = localStorage.getItem('currentPropertyId') || 'default'
      await createRule(propertyId, formData)
      setFormData({
        name: '',
        trigger: 'motion_detected',
        action: 'turn_on',
        triggerDevice: '',
        actionDevice: '',
        enabled: true,
      })
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-display-md font-bold">Automation Rules</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          + New Rule
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-surface-container rounded-lg p-6 mb-8 space-y-4"
        >
          <div>
            <label className="block text-body-md font-medium mb-2">Rule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Motion Detection"
              className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-body-md font-medium mb-2">IF (Trigger)</label>
              <select
                value={formData.trigger}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="motion_detected">Motion Detected</option>
                <option value="door_unlocked">Door Unlocked</option>
                <option value="temp_above">Temperature Above 28°C</option>
                <option value="temp_below">Temperature Below 18°C</option>
                <option value="time">Time Based</option>
              </select>
            </div>

            <div>
              <label className="block text-body-md font-medium mb-2">THEN (Action)</label>
              <select
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className="w-full bg-surface border border-gray-600 rounded-lg px-4 py-2 text-white"
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
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-4 py-2 border border-gray-600 rounded-lg hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Rules List */}
      <div className="space-y-4">
        {automationRules.map((rule) => (
          <div key={rule.id} className="bg-surface-container rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-body-lg font-medium mb-2">{rule.name}</h3>
                <p className="text-on-surface-variant text-body-sm mb-3">
                  <span className="font-medium">IF</span> {rule.trigger.replace('_', ' ')}{' '}
                  <span className="font-medium">THEN</span> {rule.action.replace('_', ' ')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(rule.id, rule.enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    rule.enabled ? 'bg-primary' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                      rule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="px-3 py-1 text-red-400 hover:text-red-300 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {automationRules.length === 0 && (
        <div className="text-center py-12">
          <p className="text-on-surface-variant mb-4">No automation rules yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-primary hover:text-primary/80"
          >
            Create your first rule
          </button>
        </div>
      )}
    </div>
  )
}
