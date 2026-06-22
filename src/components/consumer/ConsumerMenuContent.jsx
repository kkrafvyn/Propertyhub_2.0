import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { IconHeart } from '../icons'
import { hasCapability } from '../../lib/capabilities'
import {
  CONSUMER_ACTIVITY_LINKS,
  CONSUMER_AI_LINKS,
  CONSUMER_QUICK_ACTIONS,
  getContextualTabs,
} from '../../lib/consumer-nav'
import { fetchConsumerActivity } from '../../services/consumer-service'
import { fetchReservations } from '../../services/reservation-service'
import { syncSavedIds } from '../../lib/saved-listings'

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-secondary">{title}</h2>
      {children}
    </section>
  )
}

function MenuRow({ to, label, meta, authRequired, user, onNavigate }) {
  const dest = authRequired && !user ? '/login' : to
  return (
    <Link
      to={dest}
      state={authRequired && !user ? { from: to } : undefined}
      onClick={onNavigate}
      className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm transition hover:bg-surface-subtle"
    >
      <span className="font-medium text-ink">{label}</span>
      {meta != null && <span className="text-ink-secondary">{meta}</span>}
    </Link>
  )
}

export default function ConsumerMenuContent({ onNavigate, showIntro = true }) {
  const { t } = useTranslation()
  const { user, capabilities } = useAuth()
  const [savedCount, setSavedCount] = useState(0)
  const [tripCount, setTripCount] = useState(0)
  const [activityFeed, setActivityFeed] = useState([])

  useEffect(() => {
    syncSavedIds().then((ids) => setSavedCount(ids.length))
    if (user) {
      fetchReservations(true).then(({ reservations }) => setTripCount(reservations?.length ?? 0))
      fetchConsumerActivity().then(({ activity }) => setActivityFeed(activity ?? []))
    }
  }, [user])

  const activityLinks = CONSUMER_ACTIVITY_LINKS.filter(
    (a) => !a.cap || hasCapability(capabilities, a.cap),
  )
  const contextualTabs = user ? getContextualTabs(capabilities) : []
  const quickActions = CONSUMER_QUICK_ACTIONS.filter(
    (a) => !a.cap || hasCapability(capabilities, a.cap),
  )
  const activityMeta = {
    '/saved': savedCount || undefined,
    '/trips': tripCount || undefined,
  }

  return (
    <div className="px-4 pb-8 pt-2">
      {showIntro && (
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink">{t('consumer.dashboard.title')}</h1>
        </div>
      )}

      <Section title={t('mobile.menuShortcuts')}>
        <Link
          to="/saved"
          onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-surface-border bg-surface py-3 text-sm font-semibold text-ink"
        >
          <IconHeart className="h-5 w-5" />
          {t('mobile.saved')}
          {savedCount > 0 && (
            <span className="rounded-full bg-mobile-forest/10 px-2 py-0.5 text-xs text-mobile-forest">{savedCount}</span>
          )}
        </Link>
      </Section>

      <Section title={t('consumer.dashboard.myActivity')}>
        <div className="space-y-2">
          {activityLinks.map(({ to, labelKey, authRequired }) => (
            <MenuRow
              key={to}
              to={to}
              label={t(labelKey)}
              meta={activityMeta[to]}
              authRequired={authRequired}
              user={user}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </Section>

      {contextualTabs.length > 0 && (
        <Section title={t('mobile.menuWorkspace')}>
          <div className="flex flex-wrap gap-2">
            {contextualTabs.map(({ to, labelKey }) => (
              <Link
                key={to}
                to={to}
                onClick={onNavigate}
                className="rounded-full border border-surface-border bg-surface-subtle px-3 py-2 text-xs font-semibold text-ink"
              >
                {t(labelKey)}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {(hasCapability(capabilities, 'buy') || activityFeed.some((i) => i.category === 'deal')) && (
        <Section title={t('mobile.menuMyDeals')}>
          <div className="space-y-2">
            {hasCapability(capabilities, 'buy') && (
              <>
                <MenuRow to="/offers" label={t('mobile.menuActiveOffers')} user={user} onNavigate={onNavigate} />
                <MenuRow to="/transactions" label={t('mobile.menuClosingPipeline')} user={user} onNavigate={onNavigate} />
              </>
            )}
            {activityFeed
              .filter((i) => i.link?.includes('offer') || i.link?.includes('transaction'))
              .slice(0, 3)
              .map((item) => (
                <MenuRow
                  key={item.id}
                  to={item.link || '/offers'}
                  label={item.title}
                  meta={item.body}
                  user={user}
                  onNavigate={onNavigate}
                />
              ))}
          </div>
        </Section>
      )}

      <Section title={t('consumer.dashboard.aiAssistant')}>
        <div className="space-y-2">
          {CONSUMER_AI_LINKS.map(({ to, labelKey }) => (
            <MenuRow key={to} to={to} label={t(labelKey)} user={user} onNavigate={onNavigate} />
          ))}
        </div>
      </Section>

      <Section title={t('consumer.dashboard.quickActions')}>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className="rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-ink"
            >
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}
