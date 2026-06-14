import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchPaymentIntegrationsStatus, oauthAvailable } from '../lib/integrations-status'

export default function IntegrationsBanner({ showOAuth = false, showPayments = false }) {
  const { t } = useTranslation()
  const [payments, setPayments] = useState(null)

  useEffect(() => {
    if (showPayments) fetchPaymentIntegrationsStatus().then(setPayments)
  }, [showPayments])

  const payReady = payments?.ready || payments?.paystack || payments?.stripe
  const showPayBanner = showPayments && payments && !payReady
  const showOAuthBanner = showOAuth && oauthAvailable()

  if (!showPayBanner && !showOAuthBanner) return null

  return (
    <div className="mb-4 space-y-2">
      {showOAuthBanner && (
        <p className="rounded-lg border border-surface-border bg-surface-subtle px-4 py-3 text-sm text-ink-secondary">
          {t('integrations.oauthHint')}
        </p>
      )}
      {showPayBanner && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {t('integrations.paymentsHint')}
        </p>
      )}
    </div>
  )
}
