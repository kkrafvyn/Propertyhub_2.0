import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { EmptyPanel, PrimaryButton } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'

export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <DesktopShell search={<CompactSearch />}>
      <EmptyPanel
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={
          <div className="space-y-3">
            <p className="text-5xl font-bold text-ink">404</p>
            <PrimaryButton as={Link} to="/">{t('common.backToHome')}</PrimaryButton>
          </div>
        }
      />
    </DesktopShell>
  )
}
