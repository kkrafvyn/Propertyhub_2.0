import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import MobileShell from '../components/MobileShell'
import { IconCheck } from '../components/icons'
import { PageTitle, PrimaryButton, SecondaryButton } from '../components/ui/AirbnbUI'
import { MobilePrimaryButton } from '../components/ui/MobileUI'
import { useTranslation } from '../i18n/LocaleContext'
import { useIsMobileViewport } from '../hooks/useMediaQuery'
import { trackFunnel } from '../lib/analytics'
import { confirmCheckoutPublic as confirmCheckout } from '../services/payments-service'

function markRentPaidLocally(rentPaymentId) {
  if (!rentPaymentId) return
  try {
    const key = 'baytmiftah_rent_paid'
    const paid = JSON.parse(localStorage.getItem(key) || '[]')
    if (!paid.includes(rentPaymentId)) {
      localStorage.setItem(key, JSON.stringify([...paid, rentPaymentId]))
    }
  } catch { /* */ }
}

function SuccessContent() {
  const { t } = useTranslation()
  const isMobile = useIsMobileViewport()
  const [params] = useSearchParams()
  const [status, setStatus] = useState('confirming')
  const provider = params.get('provider') || 'paystack'
  const purpose = params.get('purpose') || ''
  const rentId = params.get('rent_payment_id')
  const billId = params.get('bill_id')
  const paymentId = params.get('payment_id')

  useEffect(() => {
    trackFunnel('payment_completed', { provider, purpose: purpose || 'checkout' })
    if (purpose === 'rent' || rentId) markRentPaidLocally(rentId)

    if (!paymentId) {
      setStatus('done')
      return
    }

    confirmCheckout({
      paymentId,
      metadata: {
        purpose: purpose || undefined,
        rent_payment_id: rentId,
        bill_id: billId,
      },
    }).then((result) => {
      setStatus(result.ok ? 'done' : 'error')
    }).catch(() => setStatus('error'))
  }, [provider, purpose, rentId, billId, paymentId])

  const utilitiesLink = purpose === 'utility' ? '/renter/utilities' : '/renter/payments'

  const body = (
    <div className={`mx-auto max-w-lg ${isMobile ? 'px-4 py-8' : 'py-12'}`}>
      <div className="panel-card px-8 py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <IconCheck className="h-8 w-8" />
        </div>
        <PageTitle
          title={t('paymentsPage.successTitle')}
          subtitle={
            status === 'confirming'
              ? 'Finalizing payment…'
              : status === 'error'
                ? 'Payment received — sync pending. Check your payments page.'
                : t('paymentsPage.successSubtitle', { provider })
          }
        />
        <div className="flex flex-wrap justify-center gap-3">
          {isMobile ? (
            <>
              <MobilePrimaryButton as={Link} to="/trips">{t('paymentsPage.viewTrips')}</MobilePrimaryButton>
              <MobilePrimaryButton as={Link} to={utilitiesLink} className="bg-surface text-ink border border-surface-border">
                {purpose === 'utility' ? 'Utilities' : t('paymentsPage.renterPayments')}
              </MobilePrimaryButton>
            </>
          ) : (
            <>
              <PrimaryButton as={Link} to="/trips">{t('paymentsPage.viewTrips')}</PrimaryButton>
              <SecondaryButton as={Link} to={utilitiesLink}>
                {purpose === 'utility' ? 'Utilities' : t('paymentsPage.renterPayments')}
              </SecondaryButton>
              <SecondaryButton as={Link} to="/">{t('paymentsPage.home')}</SecondaryButton>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return <MobileShell hideNav>{body}</MobileShell>
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      {body}
    </DesktopShell>
  )
}

export default function PaymentSuccessPage() {
  return <SuccessContent />
}
