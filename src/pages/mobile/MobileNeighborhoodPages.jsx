import { Link, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import MobileShell, { MobileHeader } from '../../components/MobileShell'
import { MobileBoltListingTile, MobileEmpty } from '../../components/ui/MobileUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { fetchNeighborhood, fetchNeighborhoods } from '../../services/neighborhood-service'
import { fetchListings } from '../../services/marketplace-service'

export function MobileNeighborhoodsPage() {
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
    <MobileShell>
      <MobileHeader title={t('neighborhoodPage.title')} backTo="/" />
      {loading ? (
        <div className="mx-4 h-48 animate-pulse rounded-xl bg-surface-hover" />
      ) : (
        <div className="space-y-3 px-4 pb-6">
          {neighborhoods.map((n) => (
            <Link
              key={n.slug}
              to={`/neighborhoods/${n.slug}`}
              className="block rounded-2xl border border-surface-border bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-ink">{n.name}</p>
                <span className="rounded-full bg-mobile-forest/10 px-2.5 py-0.5 text-xs font-bold text-mobile-forest">
                  {n.score}/100
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-ink-secondary">{n.summary}</p>
              <p className="mt-2 text-xs font-semibold text-mobile-forest">
                {t('neighborhoodPage.growthLabel', { growth: n.growth })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </MobileShell>
  )
}

export function MobileNeighborhoodDetailPage() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const [n, setN] = useState(null)
  const [listings, setListings] = useState([])

  useEffect(() => {
    fetchNeighborhood(slug).then(setN)
    fetchListings().then(({ listings: rows }) => setListings(rows))
  }, [slug])

  const areaListings = useMemo(() => {
    if (!n) return []
    const key = n.name.toLowerCase()
    return listings.filter((l) => `${l.location}`.toLowerCase().includes(key)).slice(0, 12)
  }, [listings, n])

  if (!n) {
    return (
      <MobileShell hideNav>
        <MobileHeader title={t('neighborhoodPage.title')} backTo="/neighborhoods" />
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-accent border-t-transparent" />
        </div>
      </MobileShell>
    )
  }

  const metrics = [
    { label: t('neighborhoodPage.schools'), value: `${n.schools}/5` },
    { label: t('neighborhoodPage.safety'), value: `${n.safety}/5` },
    { label: t('neighborhoodPage.healthcare'), value: `${n.healthcare}/5` },
    { label: t('neighborhoodPage.infrastructure'), value: `${n.infrastructure}/5` },
  ]

  return (
    <MobileShell hideNav>
      <MobileHeader title={n.name} subtitle={n.summary} backTo="/neighborhoods" />
      <div className="space-y-5 px-4 pb-8">
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-xl bg-surface-subtle p-3 text-center">
              <p className="text-lg font-bold text-ink">{m.value}</p>
              <p className="text-xs text-ink-secondary">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-surface-border p-3">
            <p className="text-sm font-bold text-ink">GHS {(n.medianPrice || 0).toLocaleString()}</p>
            <p className="text-[10px] text-ink-secondary">{t('neighborhoodPage.medianPrice')}</p>
          </div>
          <div className="rounded-xl border border-surface-border p-3">
            <p className="text-sm font-bold text-ink">{n.growth}</p>
            <p className="text-[10px] text-ink-secondary">{t('neighborhoodPage.annualGrowth')}</p>
          </div>
          <div className="rounded-xl border border-surface-border p-3">
            <p className="text-sm font-bold text-ink">{n.score}/100</p>
            <p className="text-[10px] text-ink-secondary">{t('neighborhoodPage.score')}</p>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-base font-bold text-ink">{t('mobile.neighborhoodListings')}</h2>
          {areaListings.length === 0 ? (
            <MobileEmpty title={t('home.noMatches')} description={t('home.tryAdjusting')} />
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {areaListings.map((listing) => (
                <MobileBoltListingTile key={listing.id} listing={listing} to={`/property/${listing.id}`} />
              ))}
            </div>
          )}
        </section>
      </div>
    </MobileShell>
  )
}
