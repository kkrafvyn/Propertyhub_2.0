import { useEffect, useState } from 'react'
import AgentShell from '../../components/AgentShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchTasks } from '../../services/agent-service'

function Tasks() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    fetchTasks().then(({ tasks: rows }) => setTasks(rows))
  }, [])

  function toggleDone(id) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  return (
    <AgentShell title="Tasks" subtitle="Follow-ups, documents, and listing updates">
      <ul className="space-y-3">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-3 rounded-card border border-surface-border bg-surface p-4">
            <button
              type="button"
              onClick={() => toggleDone(t.id)}
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                t.done ? 'bg-brand-dark text-brand' : 'border border-surface-border'
              }`}
            >
              {t.done ? '✓' : ''}
            </button>
            <div className="flex-1">
              <p className={`font-medium ${t.done ? 'text-ink-secondary line-through' : ''}`}>{t.title}</p>
              <p className="mt-1 text-xs text-ink-secondary">Due {t.due} · {t.priority} priority</p>
            </div>
          </li>
        ))}
      </ul>
    </AgentShell>
  )
}

export default function AgentTasksPage() {
  return <ProtectedRoute><Tasks /></ProtectedRoute>
}
