import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { PageTitle } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'

const sections = [
  { id: 'getting-started', titleKey: 'help.gettingStarted', bodyKey: 'help.gettingStartedBody' },
  { id: 'listings', titleKey: 'help.listings', bodyKey: 'help.listingsBody' },
  { id: 'payments', titleKey: 'help.payments', bodyKey: 'help.paymentsBody' },
  { id: 'safety', titleKey: 'help.safety', bodyKey: 'help.safetyBody' },
]

export default function HelpCentrePage() {
  const { t } = useTranslation()

  return (
    <DesktopShell search={<CompactSearch />}>
      <PageTitle title={t('help.title')} subtitle={t('help.subtitle')} />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-2 text-sm">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="block font-semibold text-ink underline-offset-2 hover:underline">
              {t(s.titleKey)}
            </a>
          ))}
          <Link to="/referral" className="block font-semibold text-ink underline-offset-2 hover:underline">
            {t('referral.title')}
          </Link>
        </nav>
        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="panel-card p-6">
              <h2 className="text-lg font-semibold">{t(s.titleKey)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-secondary">{t(s.bodyKey)}</p>
            </section>
          ))}
        </div>
      </div>
    </DesktopShell>
  )
}
