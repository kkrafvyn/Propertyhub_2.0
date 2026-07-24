import { useState } from 'react'
import { Link } from 'react-router'
import { LanguagePanel } from './LanguageSwitcher'
import { IconMoon, IconSun } from './icons'
import { useCurrency } from '../../context/CurrencyContext'
import { useTheme } from '../../context/ThemeContext'
import { useTranslation } from '../../i18n/LocaleContext'
import { requestPushPermission } from '../../lib/baytmiftah/push-service'

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
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const isDark = theme === 'dark'

  return (
    <div>
      <p className="mb-3 text-sm text-ink-secondary">{t('profile.themeDesc')}</p>
      <button
        type="button"
        onClick={toggleTheme}
        className="flex w-full items-center justify-between rounded-xl border border-surface-border px-4 py-3 text-sm font-semibold text-ink transition hover:bg-surface-hover"
        aria-pressed={isDark}
      >
        <span>{isDark ? t('profile.themeDark') : t('profile.themeLight')}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle">
          {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
        </span>
      </button>
      <p className="mt-2 text-xs text-ink-secondary">{t('profile.themeTapToSwitch')}</p>
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
      <Link to="/help" className={linkClass}>{t('profile.helpCentre')}</Link>
      <Link to="/privacy" className={linkClass}>{t('footer.privacy')}</Link>
      <Link to="/terms" className={linkClass}>{t('footer.terms')}</Link>
      <Link to="/referral" className={linkClass}>{t('referral.title')}</Link>
    </div>
  )
}

export function AppSettingsPanels({ includeLegal = false }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
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
