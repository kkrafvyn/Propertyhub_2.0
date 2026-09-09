import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  Building2,
  Calendar,
  ChevronRight,
  CreditCard,
  FileCheck,
  FileText,
  Heart,
  Home,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { useTranslation } from '../../../i18n/LocaleContext'
import { hasCapability } from '../../../lib/baytmiftah/capabilities'
import {
  CONSUMER_ACTIVITY_LINKS,
  CONSUMER_AI_MENU,
  CONSUMER_QUICK_ACTIONS,
  getContextualTabs,
} from '../../../lib/baytmiftah/consumer-nav'
import { openBaytMiftahAIPanel } from '../../../lib/baytmiftah/ai-panel'
import { fetchConsumerActivity } from '../../../lib/baytmiftah/consumer-service'
import { fetchReservations } from '../../../lib/baytmiftah/reservation-service'
import { getSavedIds } from '../../../lib/baytmiftah/saved-listings'
import { CONSUMER_ROUTES } from '../../../lib/consumer-routes'

const ICON_MAP: Record<string, LucideIcon> = {
  search: Search,
  heart: Heart,
  message: MessageSquare,
  calendar: Calendar,
  document: FileText,
  home: Home,
  card: CreditCard,
  wrench: Wrench,
  sparkles: Sparkles,
  wallet: Wallet,
  dashboard: LayoutDashboard,
  lease: KeyRound,
  offers: FileCheck,
  transactions: ShieldCheck,
  insights: TrendingUp,
  host: Building2,
}

function getTabIcon(to: string, labelKey: string): string {
  if (to.includes('lease')) return 'lease'
  if (to.includes('rental')) return 'home'
  if (to.includes('payment') || to.includes('billing')) return 'card'
  if (to.includes('maintenance')) return 'wrench'
  if (to.includes('trip') || to.includes('reservation')) return 'calendar'
  if (to.includes('application') || to.includes('offer')) return 'offers'
  if (to.includes('transaction')) return 'transactions'
  if (to.includes('workspace')) return 'host'
  if (to.includes('saved')) return 'heart'
  if (to.includes('message')) return 'message'
  if (to.includes('search')) return 'search'
  if (to.includes('wallet')) return 'wallet'
  return 'document'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2.5 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-secondary">
        {title}
      </h2>
      {children}
    </section>
  )
}

function MenuActionRow({
  label,
  description,
  onAction,
  icon = 'document',
}: {
  label: string
  description?: string
  onAction: () => void
  icon?: string
}) {
  const Icon = ICON_MAP[icon] || ICON_MAP.document

  return (
    <button
      type="button"
      onClick={onAction}
      className="bm-menu-row group flex w-full items-center gap-3.5 rounded-2xl border border-surface-border bg-surface px-3.5 py-3 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-forest/30 hover:bg-surface-hover hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-forest/10 text-brand-forest transition-colors duration-200 group-hover:bg-brand-forest group-hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block truncate text-xs text-ink-secondary">{description}</span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-forest" />
    </button>
  )
}

function MenuRow({
  to,
  label,
  meta = null,
  authRequired = false,
  user,
  onNavigate,
  icon = 'document',
}: {
  to: string
  label: string
  meta?: any
  authRequired?: boolean
  user?: any
  onNavigate?: () => void
  icon?: string
}) {
  const dest = authRequired && !user ? CONSUMER_ROUTES.login : to
  const Icon = ICON_MAP[icon] || ICON_MAP.document

  return (
    <Link
      to={dest}
      state={authRequired && !user ? { from: to } : undefined}
      onClick={onNavigate}
      className="bm-menu-row group flex items-center gap-3.5 rounded-2xl border border-surface-border bg-surface px-3.5 py-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-forest/30 hover:bg-surface-hover hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-forest/10 text-brand-forest transition-colors duration-200 group-hover:bg-brand-forest group-hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{label}</span>
      </span>
      {meta != null && (
        <span className="rounded-full bg-brand-forest/10 px-2.5 py-0.5 text-xs font-bold text-brand-forest dark:bg-emerald-500/20 dark:text-emerald-400">
          {meta}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-secondary transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-forest" />
    </Link>
  )
}

export default function ConsumerMenuContent({
  onNavigate,
  showIntro = true,
}: {
  onNavigate?: () => void
  showIntro?: boolean
}) {
  const { t } = useTranslation()
  const { user, capabilities } = useAuth()
  const [savedCount, setSavedCount] = useState(0)
  const [tripCount, setTripCount] = useState(0)
  const [activityFeed, setActivityFeed] = useState<any[]>([])

  useEffect(() => {
    setSavedCount(getSavedIds().length)
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
  const activityMeta: Record<string, any> = {
    [CONSUMER_ROUTES.saved]: savedCount || undefined,
    [CONSUMER_ROUTES.trips]: tripCount || undefined,
  }

  const uniqueContextualTabs = contextualTabs.filter(
    (tab, index, self) => index === self.findIndex((t) => t.to === tab.to && t.labelKey === tab.labelKey),
  )

  return (
    <div
      className="px-4 pt-4"
      style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {showIntro && (
        <div className="mb-5">
          <h1 className="text-xl font-bold text-ink">{t('consumer.dashboard.title')}</h1>
        </div>
      )}

      {uniqueContextualTabs.length > 0 && (
        <Section title={t('consumer.dashboard.myJourneys')}>
          <div className="space-y-2">
            {uniqueContextualTabs.map(({ to, labelKey }, idx) => (
              <MenuRow
                key={`${to}-${labelKey}-${idx}`}
                to={to}
                label={t(labelKey)}
                icon={getTabIcon(to, labelKey)}
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
                <MenuRow
                  to={CONSUMER_ROUTES.applications}
                  label={t('mobile.menuActiveOffers')}
                  icon="offers"
                  user={user}
                  onNavigate={onNavigate}
                />
                <MenuRow
                  to={CONSUMER_ROUTES.transactions}
                  label={t('mobile.menuClosingPipeline')}
                  icon="transactions"
                  user={user}
                  onNavigate={onNavigate}
                />
              </>
            )}
            {activityFeed
              .filter((i) => i.link?.includes('offer') || i.link?.includes('transaction'))
              .slice(0, 3)
              .map((item) => (
                <MenuRow
                  key={item.id}
                  to={item.link || CONSUMER_ROUTES.applications}
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
        <MenuActionRow
          label={t(CONSUMER_AI_MENU.labelKey)}
          description={t(CONSUMER_AI_MENU.descriptionKey)}
          icon="sparkles"
          onAction={() => {
            openBaytMiftahAIPanel()
            onNavigate?.()
          }}
        />
      </Section>

      <Section title={t('consumer.dashboard.quickActions')}>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ to, labelKey }) => (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className="rounded-full border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-brand-forest/30 hover:bg-brand-forest hover:text-white hover:shadow-sm"
            >
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </Section>
    </div>
  )
}
