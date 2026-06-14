import { useEffect, useState } from 'react'
import DeveloperShell from '../../components/DeveloperShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchProjects, fetchProjectUnits } from '../../services/developer-service'

function Projects() {
  const { t } = useTranslation()
  const [projects, setProjects] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [units, setUnits] = useState([])

  useEffect(() => {
    fetchProjects().then(({ projects: rows }) => {
      setProjects(rows)
      if (rows[0]) setSelectedId(rows[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetchProjectUnits(selectedId).then(({ units: rows }) => setUnits(rows))
  }, [selectedId])

  return (
    <DeveloperShell titleKey="hubs.developer.projects.title" subtitleKey="hubs.developer.projects.subtitle">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelectedId(p.id)}
            className={`panel-card bg-surface p-5 text-left transition ${selectedId === p.id ? 'ring-2 ring-brand-accent' : ''}`}
          >
            <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize text-ink">{p.status.replace('_', ' ')}</span>
            <h2 className="mt-3 font-semibold">{p.name}</h2>
            <p className="text-sm text-ink-secondary">{p.location}</p>
            <p className="mt-3 text-sm">{p.sold}/{p.units} units sold · Complete {p.completion}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand" style={{ width: `${p.progress}%` }} />
            </div>
          </button>
        ))}
      </div>

      {selectedId && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">{t('extensions.units.inventoryTitle')}</h2>
          <div className="overflow-hidden panel-card bg-surface">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-surface-border bg-surface-subtle">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t('extensions.units.unit')}</th>
                  <th className="px-4 py-3 font-semibold">{t('extensions.units.floor')}</th>
                  <th className="px-4 py-3 font-semibold">{t('extensions.units.beds')}</th>
                  <th className="px-4 py-3 font-semibold">{t('extensions.units.sqft')}</th>
                  <th className="px-4 py-3 font-semibold">{t('extensions.units.price')}</th>
                  <th className="px-4 py-3 font-semibold">{t('extensions.units.status')}</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id} className="border-b border-surface-border last:border-0">
                    <td className="px-4 py-3 font-medium">{u.unit_number}</td>
                    <td className="px-4 py-3">{u.floor ?? '—'}</td>
                    <td className="px-4 py-3">{u.bedrooms ?? '—'}</td>
                    <td className="px-4 py-3">{u.sqft?.toLocaleString() ?? '—'}</td>
                    <td className="px-4 py-3">GHS {Number(u.price).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-semibold capitalize">{u.status}</span>
                    </td>
                  </tr>
                ))}
                {!units.length && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-ink-secondary">{t('extensions.units.empty')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <button type="button" className="mt-6 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white">New project</button>
    </DeveloperShell>
  )
}

export default function DeveloperProjectsPage() {
  return <ProtectedRoute><Projects /></ProtectedRoute>
}
