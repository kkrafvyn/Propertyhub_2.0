import { useTranslation } from '../i18n/LocaleContext'
import DesktopShell from '../components/DesktopShell'
import PageMeta from '../components/PageMeta'

export default function PrivacyPage() {
  const { t } = useTranslation()
  const sections = ['collect', 'use', 'share', 'security', 'rights', 'contact']

  return (
    <DesktopShell minimal>
      <PageMeta title={t('legal.privacy.title')} />
      <article className="mx-auto max-w-3xl py-8">
        <h1 className="text-3xl font-semibold text-ink">{t('legal.privacy.title')}</h1>
        <p className="mt-2 text-sm text-ink-secondary">{t('legal.lastUpdated')}</p>
        <p className="mt-6 text-ink-secondary">{t('legal.privacy.intro')}</p>
        <div className="mt-8 space-y-8">
          {sections.map((key) => (
            <section key={key}>
              <h2 className="text-lg font-semibold text-ink">{t(`legal.privacy.${key}Title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{t(`legal.privacy.${key}Body`)}</p>
            </section>
          ))}
        </div>
      </article>
    </DesktopShell>
  )
}
