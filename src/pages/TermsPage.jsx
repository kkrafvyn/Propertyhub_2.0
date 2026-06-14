import { useTranslation } from '../i18n/LocaleContext'
import DesktopShell from '../components/DesktopShell'
import PageMeta from '../components/PageMeta'

export default function TermsPage() {
  const { t } = useTranslation()
  const sections = ['acceptance', 'listings', 'payments', 'accounts', 'liability', 'law']

  return (
    <DesktopShell minimal>
      <PageMeta title={t('legal.terms.title')} />
      <article className="mx-auto max-w-3xl py-8">
        <h1 className="text-3xl font-semibold text-ink">{t('legal.terms.title')}</h1>
        <p className="mt-2 text-sm text-ink-secondary">{t('legal.lastUpdated')}</p>
        <p className="mt-6 text-ink-secondary">{t('legal.terms.intro')}</p>
        <div className="mt-8 space-y-8">
          {sections.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-ink">{t(`legal.terms.${key}Title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{t(`legal.terms.${key}Body`)}</p>
            </section>
          ))}
        </div>
      </article>
    </DesktopShell>
  )
}
