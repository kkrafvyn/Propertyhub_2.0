import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Calendar,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  Home,
  MessageCircle,
  Route,
  Search,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from '../../../i18n/LocaleContext'
import { hasCapability } from '../../../lib/baytmiftah/capabilities'
import {
  CONSUMER_ACTIVITY_LINKS,
  CONSUMER_AI_LINKS,
  CONSUMER_QUICK_ACTIONS,
  getContextualTabs,
} from '../../../lib/baytmiftah/consumer-nav'
import { fetchConsumerActivity } from '../../../lib/baytmiftah/consumer-service'
import { fetchReservations } from '../../../lib/baytmiftah/reservation-service'
import { syncSavedIds } from '../../../lib/baytmiftah/saved-listings'
import { CONSUMER_ROUTES } from '../../../lib/consumer-routes'

const MENU_ICONS = {
  search: Search,
  heart: Heart,
  message: MessageCircle,
  calendar: Calendar,
  document: FileText,
  home: Home,
  card: CreditCard,
  wrench: Wrench,
  sparkles: Sparkles,
  route: Route,
}

function Section({ title, children }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function MenuRow({ to, label, meta, authRequired, user, onNavigate, icon = 'route' }) {
  const dest = authRequired && !user ? CONSUMER_ROUTES.login : to
  const Icon = MENU_ICONS[icon] || MENU_ICONS.route

  return (
    <Link
      to={dest}
      state={authRequired && !user ? { from: to } : undefined}
      onClick={onNavigate}
      className="bm-menu-row group flex items-center gap-3 rounded-2xl border border-[#e8e8e4] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(15,41,34,0.04)] transition hover:-translate-y-px hover:border-[#0f2922]/15 hover:shadow-[0_12px_28px_rgba(15,41,34,0.08)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f2922]/[0.06] text-[#0f2922] transition group-hover:bg-[#0f2922] group-hover:text-white">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[#111827]">{label}</span>
      </span>
      {meta != null && (
        <span className="rounded-full bg-[#0f2922]/10 px-2 py-0.5 text-xs font-bold text-[#0f2922]">
          {meta}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9ca3af] transition group-hover:translate-x-0.5 group-hover:text-[#0f2922]" />
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
      fetchReservations().then(({ reservations }) => setTripCount(reservations?.length ?? 0))
      fetchConsumerActivity().then(({ activity }) => setActivityFeed(activity ?? []))
    }
  }, [user])

  const activityLinks = CONSUMER_ACTIVITY_LINKS.filter(
    (a) => !a.cap || hasCapability(capabilities, a.cap),
  )
  const quickActions = CONSUMER_QUICK_ACTIONS.filter(
    (a) => !a.cap || hasCapability(capabilities, a.cap),
  )
  const contextualTabs = getContextualTabs(capabilities)
  const activityMeta = {
    [CONSUMER_ROUTES.saved]: savedCount || undefined,
    [CONSUMER_ROUTES.trips]: tripCount || undefined,
  }

  return (
    <div className="px-4 pb-8 pt-4">
      {showIntro && (
        <div className="mb-5">
          <h1 className="text-xl font-bold text-[#111827]">{t('consumer.dashboard.title')}</h1>
        </div>
      )}

      {contextualTabs.length > 0 && (
        <Section title={t('consumer.dashboard.myJourneys')}>
          <div className="space-y-2">
            {contextualTabs.map(({ to, labelKey }) => (
              <MenuRow
                key={to}
                to={to}
                label={t(labelKey)}
                icon="route"
                user={user}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </Section>
      )}

      <Section title={t('consumer.dashboard.myActivity')}>
        <div className="space-y-2">
          {activityLinks.map(({ to, labelKey, authRequired, icon }) => (
            <MenuRow
              key={to}
              to={to}
              label={t(labelKey)}
              icon={icon}
              meta={activityMeta[to]}
              authRequired={authRequired}
              user={user}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </Section>

      {(hasCapability(capabilities, 'buy') || activityFeed.some((i) => i.category === 'deal')) && (
        <Section title={t('mobile.menuMyDeals')}>
          <div className="space-y-2">
            {hasCapability(capabilities, 'buy') && (
              <>
                <MenuRow to="/offers" label={t('mobile.menuActiveOffers')} icon="document" user={user} onNavigate={onNavigate} />
                <MenuRow to="/transactions" label={t('mobile.menuClosingPipeline')} icon="document" user={user} onNavigate={onNavigate} />
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
                  icon="document"
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
            <MenuRow key={to} to={to} label={t(labelKey)} icon="sparkles" user={user} onNavigate={onNavigate} />
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
              className="rounded-full border border-[#0f2922]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0f2922] shadow-sm transition hover:-translate-y-px hover:border-[#0f2922]/30 hover:bg-[#0f2922] hover:text-white hover:shadow-md"
            >
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}
