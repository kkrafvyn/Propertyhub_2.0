import { Link } from 'react-router'
import { MobileBadge } from './MobileUI'
import { useTranslation } from '../../i18n/LocaleContext'
import { useMyKyc } from '../../hooks/useMyKyc'
import { isKycPending } from '../../lib/baytmiftah/kyc'
import { CONSUMER_ROUTES } from '../../lib/consumer-routes'

export default function ProfileKycCard({ variant = 'mobile' }) {
  const { t } = useTranslation()
  const { kyc, loading, verified } = useMyKyc()

  if (loading) return null

  const wrapClass = variant === 'mobile'
    ? 'block rounded-2xl border p-4 shadow-bolt-card'
    : 'rounded-xl border p-4'

  if (verified) {
    return (
      <div className={`${wrapClass} border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/30`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">{t('kycPage.verifiedTitle')}</p>
            <p className="mt-1 text-sm text-ink-secondary">{t('kycPage.verifiedBody')}</p>
          </div>
          {variant === 'mobile' && <MobileBadge tone="accent">{t('common.verified')}</MobileBadge>}
        </div>
      </div>
    )
  }

  const pending = isKycPending(kyc)

  return (
    <Link
      to={CONSUMER_ROUTES.kyc}
      className={`${wrapClass} border-amber-200 bg-amber-50 transition hover:bg-amber-100/80 dark:border-amber-900/40 dark:bg-amber-950/30`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {pending ? t('kycPage.pendingTitle') : t('profile.kycRequired')}
          </p>
          <p className="mt-1 text-sm text-ink-secondary">
            {pending ? t('kycPage.pendingBody') : t('profile.kycRequiredDesc')}
          </p>
          {!pending && (
            <span className="mt-3 inline-block text-sm font-semibold text-brand-accent underline">
              {t('kycPage.startVerification')}
            </span>
          )}
        </div>
        {variant === 'mobile' && (
          <MobileBadge>{pending ? t('common.pending') : t('profile.required')}</MobileBadge>
        )}
      </div>
    </Link>
  )
}
