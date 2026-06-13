import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { fetchNeighborhood, fetchNeighborhoods } from '../services/neighborhood-service'

export function NeighborhoodsIndexPage() {
  const [neighborhoods, setNeighborhoods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNeighborhoods().then(({ neighborhoods: rows }) => {
      setNeighborhoods(rows)
      setLoading(false)
    })
  }, [])

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Neighborhood intelligence</h1>
      <p className="mt-1 text-ink-secondary">Schools, safety, healthcare, and growth signals across Accra.</p>
      {loading ? (
        <div className="mt-8 h-48 animate-pulse rounded-card bg-surface-hover" />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {neighborhoods.map((n) => (
            <Link key={n.slug} to={`/neighborhoods/${n.slug}`} className="rounded-card border border-surface-border bg-surface p-5 transition hover:shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{n.name}</h2>
                <span className="rounded-full bg-brand-light px-3 py-1 text-sm font-bold text-brand-dark">{n.score}</span>
              </div>
              <p className="mt-2 text-sm text-ink-secondary">{n.summary}</p>
              <p className="mt-3 text-sm font-medium text-brand-dark">Growth {n.growth} →</p>
            </Link>
          ))}
        </div>
      )}
    </DesktopShell>
  )
}

export function NeighborhoodDetailPage() {
  const { slug } = useParams()
  const [n, setN] = useState(null)

  useEffect(() => {
    fetchNeighborhood(slug).then(setN)
  }, [slug])

  if (!n) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <p>Neighborhood not found. <Link to="/neighborhoods" className="underline">Back</Link></p>
      </DesktopShell>
    )
  }

  const metrics = [
    { label: 'Schools', value: n.schools },
    { label: 'Safety', value: n.safety },
    { label: 'Healthcare', value: n.healthcare },
    { label: 'Infrastructure', value: n.infrastructure },
  ]

  return (
    <DesktopShell search={<CompactSearch />}>
      <Link to="/neighborhoods" className="text-sm text-ink-secondary hover:text-ink">← All neighborhoods</Link>
      <h1 className="mt-4 text-3xl font-semibold">{n.name}</h1>
      <p className="mt-2 max-w-2xl text-ink-secondary">{n.summary}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-card border border-surface-border bg-surface p-4">
            <p className="text-sm text-ink-secondary">{m.label}</p>
            <p className="mt-1 text-2xl font-semibold">{m.value}<span className="text-base text-ink-muted">/5</span></p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-surface-border bg-surface p-4">
          <p className="text-sm text-ink-secondary">Median price</p>
          <p className="mt-1 text-xl font-semibold">GHS {(n.medianPrice || 0).toLocaleString?.() ?? '—'}</p>
        </div>
        <div className="rounded-card border border-surface-border bg-surface p-4">
          <p className="text-sm text-ink-secondary">Annual growth</p>
          <p className="mt-1 text-xl font-semibold text-brand-dark">{n.growth}</p>
        </div>
        <div className="rounded-card border border-surface-border bg-surface p-4">
          <p className="text-sm text-ink-secondary">BaytMiftah score</p>
          <p className="mt-1 text-xl font-semibold">{n.score}/100</p>
        </div>
      </div>
    </DesktopShell>
  )
}
