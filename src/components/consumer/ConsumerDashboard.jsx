import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  CONSUMER_ACTIVITY_LINKS,
  CONSUMER_AI_LINKS,
  CONSUMER_QUICK_ACTIONS,
} from '../../lib/consumer-nav'
import { getRecentlyViewed, getRecentSearches } from '../../lib/recent-activity'
import { hasCapability } from '../../lib/capabilities'
import { fetchConsumerActivity } from '../../services/consumer-service'
import { fetchReservations } from '../../services/reservation-service'
import { syncSavedIds } from '../../lib/saved-listings'

function Section({ title, children, className = '' }) {
  return (
    <section className={className}>
      <h2 className="mb-3 text-base font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function ActionChip({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex shrink-0 items-center rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/20"
    >
      {label}
    </Link>
  )
}

function ActivityRow({ to, label, meta, authRequired, user }) {
  const dest = authRequired && !user ? '/login' : to
  return (
    <Link
      to={dest}
      state={authRequired && !user ? { from: to } : undefined}
      className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm transition hover:bg-surface-subtle"
    >
      <span className="font-medium text-ink">{label}</span>
      {meta != null && <span className="text-ink-secondary">{meta}</span>}
    </Link>
  )
}

export default function ConsumerDashboard({ compact = false }) {
  const { t } = useTranslation()
  const { user, capabilities } = useAuth()
  const [savedCount, setSavedCount] = useState(0)
  const [tripCount, setTripCount] = useState(0)
  const [activityFeed, setActivityFeed] = useState([])
  const [recentSearches, setRecentSearches] = useState([])
  const [recentlyViewed, setRecentlyViewed] = useState([])

  useEffect(() => {
    setRecentSearches(getRecentSearches())
    setRecentlyViewed(getRecentlyViewed())
    syncSavedIds().then((ids) => setSavedCount(ids.length))
    if (user) {
      fetchReservations(true).then(({ reservations }) => setTripCount(reservations?.length ?? 0))
      fetchConsumerActivity().then(({ activity }) => setActivityFeed(activity ?? []))
    }
  }, [user])

  if (!user) return null

  const quickActions = CONSUMER_QUICK_ACTIONS.filter(
    (a) => !a.cap || hasCapability(capabilities, a.cap),
  )

  const activityMeta = {
    '/saved': savedCount || undefined,
    '/trips': tripCount || undefined,
  }

  return (
    <div className={`space-y-6 ${compact ? 'px-4 pb-2 pt-2' : 'mb-10'}`}>
      <div>
        <h1 className="text-xl font-bold text-ink">{t('consumer.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{t('consumer.dashboard.subtitle')}</p>
      </div>

      <Section title={t('consumer.dashboard.myActivity')}>
        <div className="space-y-2">
          {CONSUMER_ACTIVITY_LINKS.map(({ to, labelKey, authRequired }) => (
            <ActivityRow
              key={to}
              to={to}
              label={t(labelKey)}
              meta={activityMeta[to]}
              authRequired={authRequired}
              user={user}
            />
          ))}
        </div>

        {activityFeed.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              Recent activity
            </p>
            {activityFeed.slice(0, 6).map((item) => (
              <ActivityRow
                key={item.id}
                to={item.link || '/'}
                label={item.title}
                meta={item.body}
                authRequired={false}
                user={user}
              />
            ))}
          </div>
        )}

        {recentSearches.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              {t('consumer.activity.recentSearches')}
            </p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.slice(0, 4).map(({ query }) => (
                <Link
                  key={query}
                  to={`/explore?q=${encodeURIComponent(query)}`}
                  className="rounded-full bg-surface-subtle px-3 py-1.5 text-xs font-medium text-ink"
                >
                  {query}
                </Link>
              ))}
            </div>
          </div>
        )}

        {recentlyViewed.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              {t('consumer.activity.recentlyViewed')}
            </p>
            <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {recentlyViewed.slice(0, compact ? 4 : 8).map((item) => (
                <Link
                  key={item.id}
                  to={`/property/${item.id}`}
                  className="overflow-hidden rounded-xl border border-surface-border bg-surface"
                >
                  {item.image && (
                    <img src={item.image} alt="" className="aspect-[4/3] w-full object-cover" />
                  )}
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold text-ink">{item.title}</p>
                    {item.priceLabel && (
                      <p className="truncate text-[11px] text-ink-secondary">{item.priceLabel}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title={t('consumer.dashboard.aiAssistant')}>
        <div className="space-y-2">
          {CONSUMER_AI_LINKS.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              className="block rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm font-medium text-ink transition hover:bg-surface-subtle"
            >
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </Section>

      <Section title={t('consumer.dashboard.quickActions')}>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {quickActions.map(({ to, labelKey }) => (
            <ActionChip key={to} to={to} label={t(labelKey)} />
          ))}
        </div>
      </Section>
    </div>
  )
}
