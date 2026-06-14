import { useEffect, useState } from 'react'
import SmartShell from '../../components/SmartShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAutomations, toggleAutomation } from '../../services/smart-service'

function Automations() {
  const [rules, setRules] = useState([])

  useEffect(() => {
    fetchAutomations().then(({ automations: rows }) => setRules(rows))
  }, [])

  async function handleToggle(id, enabled) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r)))
    await toggleAutomation(id, !enabled)
  }

  return (
    <SmartShell titleKey="hubs.smart.automations.title" subtitleKey="hubs.smart.automations.subtitle">
      <ul className="space-y-3">
        {rules.map((r) => (
          <li key={r.id} className="panel-card bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="mt-1 text-sm text-ink-secondary">When: {r.trigger}</p>
                <p className="text-sm text-ink-secondary">Then: {r.action}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(r.id, r.enabled)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  r.enabled ? 'bg-brand-accent text-white' : 'bg-surface-subtle text-ink-secondary'
                }`}
              >
                {r.enabled ? 'On' : 'Off'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="mt-4 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">Create automation</button>
    </SmartShell>
  )
}

export default function SmartAutomationsPage() {
  return <ProtectedRoute><Automations /></ProtectedRoute>
}
