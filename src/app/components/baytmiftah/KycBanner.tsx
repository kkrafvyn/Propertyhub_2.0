import { Link } from 'react-router'
import { useTranslation } from '../../i18n/LocaleContext'
import { isKycPending, isKycVerified } from '../../lib/baytmiftah/kyc'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'

export default function KycBanner({ kyc }) {
  const { t } = useTranslation()

  if (isKycVerified(kyc)) return null

  const pending = isKycPending(kyc)

  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
        pending
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-surface-border bg-surface-subtle text-ink'
      }`}
    >
      <p className="font-semibold">
        {pending ? t('kycPage.pendingTitle') : t('kycPage.requiredTitle')}
      </p>
      <p className="mt-1 text-ink-secondary">
        {pending ? t('kycPage.pendingBody') : t('kycPage.requiredBody')}
      </p>
      {!pending && (
        <Link to={CONSUMER_ROUTES.kyc} className="mt-2 inline-block font-semibold text-mobile-forest underline">
          {t('kycPage.startVerification')}
        </Link>
      )}
    </div>
  )
}
