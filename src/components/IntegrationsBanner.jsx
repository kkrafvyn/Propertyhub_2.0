import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n/LocaleContext'
import { fetchPaymentIntegrationsStatus } from '../lib/integrations-status'

export default function IntegrationsBanner({ showPayments = false }) {
  const { t } = useTranslation()
  const [payments, setPayments] = useState(null)

  useEffect(() => {
    if (showPayments) fetchPaymentIntegrationsStatus().then(setPayments)
  }, [showPayments])

  const payReady = payments?.ready || payments?.paystack || payments?.stripe
  const showPayBanner = showPayments && payments && !payReady

  if (!showPayBanner) return null

  return (
    <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
      {t('integrations.paymentsHint')}
    </p>
  )
}
