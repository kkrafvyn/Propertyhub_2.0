import { useEffect, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchProjects } from '../../services/developer-service'

function Projects() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    fetchProjects().then(({ projects: rows }) => setProjects(rows))
  }, [])

  return (
    <DeveloperShell title="Projects" subtitle="Development portfolio and unit inventory">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <article key={p.id} className="rounded-card border border-surface-border bg-surface p-5">
            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold capitalize text-brand-dark">{p.status.replace('_', ' ')}</span>
            <h2 className="mt-3 font-semibold">{p.name}</h2>
            <p className="text-sm text-ink-secondary">{p.location}</p>
            <p className="mt-3 text-sm">{p.sold}/{p.units} units sold · Complete {p.completion}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand" style={{ width: `${p.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
      <button type="button" className="mt-6 rounded-lg bg-brand-dark px-5 py-2.5 text-sm font-semibold text-brand">New project</button>
    </DeveloperShell>
  )
}

export default function DeveloperProjectsPage() {
  return <ProtectedRoute><Projects /></ProtectedRoute>
}
