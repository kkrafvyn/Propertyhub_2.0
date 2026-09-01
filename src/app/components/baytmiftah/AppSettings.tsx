import { useState } from 'react'
import { Link } from 'react-router'
import { LanguagePanel } from './LanguageSwitcher'
import {
  ThemeSunIcon,
  ThemeMoonIcon,
  ThemeSystemIcon,
  ThemeLightCardPreview,
  ThemeDarkCardPreview,
  ThemeSystemCardPreview,
  AccentSwatch,
} from './ThemeIcons'
import { useCurrency } from '../../context/CurrencyContext'
import { useUserMarket } from '../../context/MarketContext'
import { useTheme } from '../../context/ThemeContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { requestPushPermission } from '../../lib/baytmiftah/push-service'
import { MARKET_PRESETS } from '../../../lib/user-market.service'

const CURRENCIES = [
  { code: 'GHS', label: '₵ GHS' },
  { code: 'USD', label: '$ USD' },
]

function SettingOption({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
        active
          ? 'border-ink bg-surface font-semibold text-ink shadow-sm'
          : 'border-surface-border text-ink-secondary hover:border-ink/30'
      }`}
    >
      {children}
    </button>
  )
}

export function MarketPanel() {
  const { t } = useTranslation()
  const { market, summary, updateMarket } = useUserMarket()
  const [saving, setSaving] = useState(false)

  if (!market || !summary) return null

  return (
    <div>
      <p className="mb-3 text-sm text-ink-secondary">{t('onboarding.settingsDesc')}</p>
      <div className="mb-4 rounded-xl border border-surface-border bg-surface-subtle px-4 py-3 text-sm">
        <p className="font-semibold text-ink">
          {market.city}, {market.country}
        </p>
        <p className="mt-1 text-ink-secondary">
          {summary.paymentProvider} · {summary.currency} · {summary.jurisdictionLabel}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {MARKET_PRESETS.map((preset) => (
          <SettingOption
            key={preset.jurisdictionId}
            active={market.jurisdictionId === preset.jurisdictionId}
            onClick={async () => {
              setSaving(true)
              try {
                await updateMarket(preset.jurisdictionId, 0)
              } finally {
                setSaving(false)
              }
            }}
          >
            <span className="mr-2" aria-hidden="true">
              {preset.flag}
            </span>
            {preset.label}
          </SettingOption>
        ))}
      </div>
      {saving ? <p className="mt-2 text-xs text-ink-secondary">{t('onboarding.saving')}</p> : null}
    </div>
  )
}

export function CurrencyPanel() {
  const { currency, setCurrency } = useCurrency()
  const { t } = useTranslation()

  return (
    <div>
      <p className="mb-3 text-sm text-ink-secondary">{t('profile.currencyDesc')}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {CURRENCIES.map(({ code, label }) => (
          <SettingOption key={code} active={currency === code} onClick={() => setCurrency(code as 'GHS' | 'USD')}>
            {label}
          </SettingOption>
        ))}
      </div>
    </div>
  )
}

export function ThemePanel() {
  const { theme, resolvedTheme, accent, setTheme, setAccent } = useTheme()
  const { t } = useTranslation()

  const THEME_OPTIONS = [
    {
      id: 'light' as const,
      label: t('profile.themeLight'),
      desc: 'Daylight Ivory & Forest Emerald',
      icon: ThemeSunIcon,
      preview: ThemeLightCardPreview,
    },
    {
      id: 'dark' as const,
      label: t('profile.themeDark'),
      desc: 'Emerald Midnight & Jade Glow',
      icon: ThemeMoonIcon,
      preview: ThemeDarkCardPreview,
    },
    {
      id: 'system' as const,
      label: 'System (Auto)',
      desc: `Sync with device (${resolvedTheme === 'dark' ? 'currently dark' : 'currently light'})`,
      icon: ThemeSystemIcon,
      preview: ThemeSystemCardPreview,
    },
  ]

  const ACCENT_OPTIONS = [
    {
      id: 'emerald' as const,
      label: 'Emerald Forest',
      color1: '#0f2922',
      color2: '#52b788',
    },
    {
      id: 'midnight' as const,
      label: 'Midnight Sapphire',
      color1: '#0369a1',
      color2: '#38bdf8',
    },
    {
      id: 'oasis' as const,
      label: 'Sandstone Oasis',
      color1: '#c2410c',
      color2: '#fb923c',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm text-ink-secondary">
          {t('profile.themeDesc')}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {THEME_OPTIONS.map(({ id, label, desc, icon: Icon, preview: PreviewComponent }) => {
            const isSelected = theme === id

            return (
              <button
                key={id}
                type="button"
                onClick={(e) => setTheme(id, e)}
                className={`group relative flex flex-col rounded-2xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-primary bg-surface-subtle shadow-md ring-2 ring-primary/20'
                    : 'border-surface-border bg-surface hover:border-ink-secondary/30 hover:bg-surface-hover'
                }`}
                aria-pressed={isSelected}
              >
                {/* SVG Visual Card Preview */}
                <div className="mb-3 w-full overflow-hidden rounded-xl border border-surface-border/60 transition-transform duration-300 group-hover:scale-[1.02]">
                  <PreviewComponent className="w-full h-auto" />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className="h-4 w-4 shrink-0 text-ink" />
                      <p className="truncate text-sm font-semibold text-ink">{label}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-secondary">{desc}</p>
                  </div>

                  {/* Active Radio Badge */}
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-surface-border bg-surface'
                    }`}
                  >
                    {isSelected && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3 w-3"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="border-t border-surface-border pt-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Palette Accent Highlights
        </p>
        <p className="mb-3 text-sm text-ink-secondary">
          Personalize active highlights, tags, and brand tones.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {ACCENT_OPTIONS.map((item) => (
            <AccentSwatch
              key={item.id}
              accent={item.id}
              selected={accent === item.id}
              onClick={() => setAccent(item.id)}
              label={item.label}
              color1={item.color1}
              color2={item.color2}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function PushNotificationsPanel() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [permission, setPermission] = useState(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'),
  )

  if (permission === 'unsupported') return null

  async function enable() {
    setLoading(true)
    await requestPushPermission()
    setPermission(Notification.permission)
    setLoading(false)
  }

  return (
    <div>
      <p className="mb-3 text-sm text-ink-secondary">{t('profile.pushDesc')}</p>
      {permission === 'granted' ? (
        <p className="text-sm font-medium text-ink">{t('profile.pushEnabled')}</p>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={loading}
          className="rounded-xl border border-surface-border px-4 py-3 text-sm font-semibold text-ink hover:border-ink/30 disabled:opacity-60"
        >
          {loading ? t('extensions.push.enabling') : t('extensions.push.enable')}
        </button>
      )}
    </div>
  )
}

export function LegalLinks({ className = 'flex flex-col gap-2' }) {
  const { t } = useTranslation()

  const linkClass = 'text-sm font-medium text-ink hover:underline'

  return (
    <div className={className}>
      <Link to="/legal" className={linkClass}>{t('legal.hub.allPolicies')}</Link>
      <Link to="/help" className={linkClass}>{t('profile.helpCentre')}</Link>
      <Link to="/complaint" className={linkClass}>{t('legal.complaint.title')}</Link>
      <Link to="/privacy" className={linkClass}>{t('footer.privacy')}</Link>
      <Link to="/terms" className={linkClass}>{t('footer.terms')}</Link>
      <Link to="/legal/payments" className={linkClass}>{t('legal.hub.paymentsTransaction')}</Link>
      <Link to="/legal/marketplace-rules" className={linkClass}>{t('legal.hub.marketplaceRules')}</Link>
      <Link to="/referral" className={linkClass}>{t('referral.title')}</Link>
    </div>
  )
}

export function AppSettingsPanels({ includeLegal = false }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">{t('onboarding.settingsTitle')}</h3>
        <MarketPanel />
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">{t('profile.language')}</h3>
        <LanguagePanel />
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">{t('profile.currency')}</h3>
        <CurrencyPanel />
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">{t('profile.theme')}</h3>
        <ThemePanel />
      </section>
      <section>
        <h3 className="mb-3 text-sm font-semibold text-ink">{t('profile.notifications')}</h3>
        <PushNotificationsPanel />
      </section>
      {includeLegal && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-ink">{t('profile.legal')}</h3>
          <LegalLinks />
        </section>
      )}
    </div>
  )
}

export function LegalSupportSection({ className = '' }) {
  const { t } = useTranslation()

  return (
    <section className={className}>
      <h3 className="mb-3 text-sm font-semibold text-ink">{t('profile.legal')}</h3>
      <LegalLinks />
    </section>
  )
}
