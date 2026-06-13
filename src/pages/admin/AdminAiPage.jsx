import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AdminShell from '../../components/AdminShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchAiOrchestration } from '../../services/trust-service'

function AiOrchestration() {
  const [modules, setModules] = useState([])

  useEffect(() => {
    fetchAiOrchestration().then(({ modules: rows }) => setModules(rows))
  }, [])

  return (
    <AdminShell title="BaytMiftah AI orchestration" subtitle="Cross-platform AI modules and request volume">
      <div className="space-y-3">
        {modules.map((m) => (
          <article key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/10 bg-white/5 p-4">
            <div>
              <p className="font-semibold">{m.name}</p>
              <Link to={m.route} className="text-sm text-brand underline">{m.route}</Link>
            </div>
            <div className="text-right">
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-semibold text-green-300 capitalize">{m.status}</span>
              <p className="mt-1 text-sm text-white/70">{m.requests24h} requests / 24h</p>
            </div>
          </article>
        ))}
      </div>
    </AdminShell>
  )
}

export default function AdminAiPage() {
  return <ProtectedRoute><AiOrchestration /></ProtectedRoute>
}
