import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { HubLinkCard, PageTitle, StatCard, StatGrid, TextLink } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchNeighborhood, fetchNeighborhoods } from '../services/neighborhood-service'

export function NeighborhoodsIndexPage() {
  const { t } = useTranslation()
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
        title={t('neighborhoodPage.title')}
        subtitle={t('neighborhoodPage.subtitle')}
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
              desc={`${n.summary} ${t('neighborhoodPage.growthLabel', { growth: n.growth })}`}
            />
          ))}
        </div>
      )}
    </DesktopShell>
  )
}

export function NeighborhoodDetailPage() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const [n, setN] = useState(null)

  useEffect(() => {
    fetchNeighborhood(slug).then(setN)
  }, [slug])

  if (!n) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <p className="text-ink-secondary">
          {t('neighborhoodPage.notFound')}{' '}
          <TextLink to="/neighborhoods">{t('neighborhoodPage.back')}</TextLink>
        </p>
      </DesktopShell>
    )
  }

  const metrics = [
    { label: t('neighborhoodPage.schools'), value: n.schools },
    { label: t('neighborhoodPage.safety'), value: n.safety },
    { label: t('neighborhoodPage.healthcare'), value: n.healthcare },
    { label: t('neighborhoodPage.infrastructure'), value: n.infrastructure },
  ]

  return (
    <DesktopShell search={<CompactSearch />}>
      <TextLink to="/neighborhoods" className="mb-4 inline-block">{t('neighborhoodPage.allNeighborhoods')}</TextLink>
      <PageTitle title={n.name} subtitle={n.summary} />

      <StatGrid cols={4}>
        {metrics.map((m) => (
          <StatCard key={m.label} label={m.label} value={`${m.value}/5`} />
        ))}
      </StatGrid>

      <StatGrid cols={3}>
        <StatCard label={t('neighborhoodPage.medianPrice')} value={`GHS ${(n.medianPrice || 0).toLocaleString?.() ?? '—'}`} />
        <StatCard label={t('neighborhoodPage.annualGrowth')} value={n.growth} />
        <StatCard label={t('neighborhoodPage.score')} value={`${n.score}/100`} />
      </StatGrid>
    </DesktopShell>
  )
}
