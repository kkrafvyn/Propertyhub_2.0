import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { HubLinkCard, PageTitle, StatCard, StatGrid, TextLink } from '../components/ui/AirbnbUI'
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
      <PageTitle
        title="Neighborhood intelligence"
        subtitle="Schools, safety, healthcare, and growth signals across Accra."
      />
      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-surface-hover" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {neighborhoods.map((n) => (
            <HubLinkCard
              key={n.slug}
              to={`/neighborhoods/${n.slug}`}
              label={`${n.name} · ${n.score}/100`}
              desc={`${n.summary} Growth ${n.growth}.`}
            />
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
        <p className="text-ink-secondary">Neighborhood not found. <TextLink to="/neighborhoods">Back</TextLink></p>
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
      <TextLink to="/neighborhoods" className="mb-4 inline-block">← All neighborhoods</TextLink>
      <PageTitle title={n.name} subtitle={n.summary} />

      <StatGrid cols={4}>
        {metrics.map((m) => (
          <StatCard key={m.label} label={m.label} value={`${m.value}/5`} />
        ))}
      </StatGrid>

      <StatGrid cols={3}>
        <StatCard label="Median price" value={`GHS ${(n.medianPrice || 0).toLocaleString?.() ?? '—'}`} />
        <StatCard label="Annual growth" value={n.growth} />
        <StatCard label="BaytMiftah score" value={`${n.score}/100`} />
      </StatGrid>
    </DesktopShell>
  )
}
