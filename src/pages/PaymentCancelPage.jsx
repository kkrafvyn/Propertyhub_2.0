import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { PageTitle, PrimaryButton, SecondaryButton } from '../components/ui/AirbnbUI'
import { useTranslation } from '../i18n/LocaleContext'

export default function PaymentCancelPage() {
  const { t } = useTranslation()

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mx-auto max-w-lg py-12">
        <div className="panel-card px-8 py-12 text-center">
          <PageTitle
            title={t('paymentsPage.cancelTitle')}
            subtitle={t('paymentsPage.cancelSubtitle')}
          />
          <div className="flex flex-wrap justify-center gap-3">
            <PrimaryButton as={Link} to="/finance">{t('paymentsPage.financeHub')}</PrimaryButton>
            <SecondaryButton as={Link} to="/">{t('paymentsPage.home')}</SecondaryButton>
          </div>
        </div>
      </div>
    </DesktopShell>
  )
}
