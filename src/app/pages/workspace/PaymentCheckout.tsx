import React, { useEffect, useState } from 'react'
import { AlertCircle, Check, CreditCard, DollarSign, Loader, Lock, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { currencyService } from '@/lib/currency.service'
import { internationalPaymentService } from '@/lib/international-payment.service'
import { paymentService } from '@/lib/payment.service'
import { listingService } from '@/lib/listing.service'
import {
  resolvePaymentContextFromListing,
  type PaymentContext,
} from '@/lib/payment-routing.service'
import { clientIntegrations } from '@/lib/integrations'
import { openPayAngelsInline } from '@/lib/payangels-inline'
import { realEstateComplianceService } from '@/lib/real-estate-compliance.service'
import { useTranslation } from '../../i18n/LocaleContext'
import { LegalAcceptanceCheckbox } from '../../components/legal/LegalAcceptanceCheckbox'
import { legalAcceptanceService } from '@/lib/legal-acceptance.service'
import { ACCEPTANCE_SCOPES, LEGAL_POLICY_VERSION } from '@/lib/legal-config'

type PaymentMethodType =
  | 'card'
  | 'bank_transfer'
  | 'mobile_money'
  | 'wallet'
  | 'crypto'
  | 'buy_now_pay_later'

interface CheckoutPaymentMethod {
  id: string
  provider: string
  methodType: PaymentMethodType
  label: string
  icon: React.ReactNode
  fees: number
}

interface CheckoutStep {
  step: 1 | 2 | 3 | 4
  title: string
  description: string
}

interface PaymentState {
  amount: number
  currency: string
  paymentMethod: string
  selectedPaymentInfo: CheckoutPaymentMethod | null
  region: string
  feesCalculated: number
  totalAmount: number
}

function getFeeSummary(amount: number, providerId?: string) {
  if (!providerId) {
    return {
      subtotal: amount,
      fee: 0,
      total: amount,
    }
  }

  return internationalPaymentService.calculateFees(amount, providerId)
}

export function PaymentCheckout({
  amount: baseAmountUsd,
  listingId,
  onSuccess,
  onCancel,
}: {
  amount: number
  listingId: string
  onSuccess: (transactionId: string) => void
  onCancel: () => void
}) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [paymentState, setPaymentState] = useState<PaymentState>({
    amount: baseAmountUsd,
    currency: 'USD',
    paymentMethod: '',
    selectedPaymentInfo: null,
    region: 'US',
    feesCalculated: 0,
    totalAmount: baseAmountUsd,
  })
  const [paymentContext, setPaymentContext] = useState<PaymentContext | null>(null)
  const [listingLoading, setListingLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<CheckoutPaymentMethod[]>([])
  const [savedMethods, setSavedMethods] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveFuturePayment, setSaveFuturePayment] = useState(false)
  const [paymentTermsAccepted, setPaymentTermsAccepted] = useState(false)
  const [completedTransactionId, setCompletedTransactionId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadListingContext() {
      try {
        setListingLoading(true)
        const listing = await listingService.getListingForPayment(listingId)
        if (!listing) {
          throw new Error('Listing not found')
        }

        const context = resolvePaymentContextFromListing(listing)
        if (cancelled) return

        setPaymentContext(context)

        const listingAmount = listing.price ? Number(listing.price) : baseAmountUsd
        const amount =
          context.currency === 'USD' ? baseAmountUsd : listingAmount || baseAmountUsd

        setPaymentState((prev) => ({
          ...prev,
          currency: context.currency,
          region: context.region,
          amount,
          totalAmount: amount,
        }))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load property payment details')
        }
      } finally {
        if (!cancelled) setListingLoading(false)
      }
    }

    void loadListingContext()

    return () => {
      cancelled = true
    }
  }, [baseAmountUsd, listingId])

  useEffect(() => {
    if (!paymentContext) return
    void loadPaymentMethods()
  }, [paymentContext, user?.id])

  async function loadPaymentMethods() {
    if (!paymentContext) return

    try {
      const config = internationalPaymentService.getPaymentConfigForProperty(paymentContext)

      const formattedMethods: CheckoutPaymentMethod[] = config.availableMethods.map((method) => ({
        id: method.id,
        provider: method.id,
        methodType: method.type,
        label: method.name,
        icon: getPaymentIcon(method.id),
        fees: method.commissionPercentage,
      }))

      setPaymentMethods(formattedMethods)

      if (formattedMethods.length > 0) {
        const defaultMethod =
          formattedMethods.find((method) => method.id === config.defaultMethod) ||
          formattedMethods[0]
        const feeSummary = getFeeSummary(paymentState.amount, defaultMethod.provider)
        setPaymentState((prev) => ({
          ...prev,
          paymentMethod: defaultMethod.id,
          selectedPaymentInfo: defaultMethod,
          feesCalculated: feeSummary.fee,
          totalAmount: feeSummary.total,
        }))
      }

      if (user?.id) {
        const saved = await internationalPaymentService.getUserPaymentMethods(user.id)
        setSavedMethods(saved || [])
      } else {
        setSavedMethods([])
      }
    } catch (err) {
      console.error('Failed to load payment methods:', err)
      setError('Failed to load payment methods')
    }
  }

  async function handlePaymentMethodSelect(methodId: string) {
    const selected = paymentMethods.find((method) => method.id === methodId)
    if (!selected) return

    const feeSummary = getFeeSummary(paymentState.amount, selected.provider)

    setPaymentState((prev) => ({
      ...prev,
      paymentMethod: methodId,
      selectedPaymentInfo: selected,
      feesCalculated: feeSummary.fee,
      totalAmount: feeSummary.total,
    }))
  }

  async function processPayment() {
    setLoading(true)
    setError(null)

    try {
      if (!user?.id) {
        throw new Error('Sign in before processing a payment.')
      }

      if (!paymentContext) {
        throw new Error('Property payment details are still loading.')
      }

      if (!paymentState.selectedPaymentInfo) {
        throw new Error('Choose a payment method before continuing.')
      }

      if (!paymentTermsAccepted) {
        throw new Error('Please accept the Payments & Transaction Processing Policy before continuing.')
      }

      await legalAcceptanceService.recordAcceptance({
        userId: user.id,
        scope: 'payment_checkout',
        policySlugs: ACCEPTANCE_SCOPES.payment_checkout.policySlugs,
        policyVersion: LEGAL_POLICY_VERSION,
      })

      if (!clientIntegrations.payangels.checkoutReady) {
        throw new Error(`Checkout is not configured for properties in ${paymentContext.propertyLabel}.`);
      }

      const checkout = await paymentService.initializePropertyPayment({
        listingId,
        amount: paymentState.totalAmount,
        purpose: "other",
      });

      if (checkout.simulated || String(checkout.accessCode || "").startsWith("sim_")) {
        throw new Error("Checkout is not configured for live payments.");
      }

      let paid = false;
      await openPayAngelsInline({
        email: user.email!,
        amountMinor: Math.round(paymentState.totalAmount * 100),
        currency: paymentContext.currency,
        reference: checkout.reference,
        accessCode: checkout.accessCode,
        onClose: () => {
          if (!paid) setLoading(false);
        },
        onSuccess: async (reference) => {
          paid = true;
          const result = await paymentService.verifyCheckoutReturn({ reference });
          if (result.status !== "success" && result.status !== "completed") {
            throw new Error("Payment verification failed.");
          }
          setCompletedTransactionId(result.transaction?.id || reference);
          setStep(4);
          onSuccess(result.transaction?.id || reference);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment processing failed')
      setLoading(false)
    }
  }

  const steps: CheckoutStep[] = [
    { step: 1, title: 'Amount', description: 'Confirm payment amount for this property' },
    { step: 2, title: 'Payment Method', description: 'Select how you want to pay' },
    { step: 3, title: 'Review & Confirm', description: 'Review and confirm your payment' },
    { step: 4, title: 'Success', description: 'Payment completed successfully' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-6 flex items-start">
            {steps.map((s, idx) => (
              <div key={s.step} className="flex min-w-0 flex-1 items-start">
                <div className="flex w-full min-w-0 flex-col items-center px-0.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold transition ${
                      step >= s.step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {step > s.step ? <Check className="h-5 w-5" /> : s.step}
                  </div>
                  <p className="mt-2 w-full truncate text-center text-[0.68rem] font-medium leading-tight text-gray-700 dark:text-gray-300 sm:text-xs">
                    {s.title}
                  </p>
                </div>
                {idx < steps.length - 1 ? (
                  <div
                    className={`mt-5 h-1 min-w-[0.35rem] flex-1 rounded-full ${
                      step > s.step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {listingLoading ? (
          <div className="flex items-center justify-center rounded-lg bg-surface border border-surface-border p-12 shadow-lg">
            <Loader className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}

        {!listingLoading && paymentContext ? (
          <div className="mb-6 rounded-lg border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-ink">Property location</p>
                <p className="text-sm text-ink-secondary">{paymentContext.propertyLabel}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Payments for this listing use a third-party payment provider in{' '}
                  <strong className="text-ink">{paymentContext.currency}</strong>.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 && !listingLoading && (
          <div className="bg-surface border border-surface-border rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-ink mb-6">
              Payment Amount
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Amount ({paymentState.currency})
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-3 w-5 h-5 text-ink-muted" />
                  <input
                    type="number"
                    value={paymentState.amount}
                    onChange={(event) => {
                      const nextAmount = Number.parseFloat(event.target.value) || 0
                      const feeSummary = getFeeSummary(
                        nextAmount,
                        paymentState.selectedPaymentInfo?.provider
                      )

                      setPaymentState((prev) => ({
                        ...prev,
                        amount: nextAmount,
                        feesCalculated: feeSummary.fee,
                        totalAmount: feeSummary.total,
                      }))
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-input-background text-ink"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-surface-subtle border border-surface-border rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Payment provider:</span>
                    <span className="font-medium text-ink">
                      Secure checkout
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-surface-subtle border border-surface-border rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Amount in {paymentState.currency}:</span>
                    <span className="font-medium text-ink">
                      {currencyService.formatCurrency(paymentState.amount, paymentState.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={onCancel}
                  className="flex-1 px-6 py-3 border border-border rounded-lg text-ink font-medium hover:bg-surface-hover transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={paymentState.amount <= 0 || paymentMethods.length === 0}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-surface border border-surface-border rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-ink mb-6">
              Select Payment Method
            </h2>

            <div className="space-y-6">
              {savedMethods.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-ink mb-3">
                    Saved Payment Methods
                  </h3>
                  <div className="space-y-2">
                    {savedMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => void handlePaymentMethodSelect(method.payment_provider)}
                        className={`w-full p-4 border-2 rounded-lg transition text-left ${
                          paymentState.paymentMethod === method.payment_provider
                            ? 'border-primary bg-primary/10'
                            : 'border-surface-border hover:border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-ink-secondary" />
                            <span className="font-medium text-ink">
                              {method.method_details?.brand || method.payment_provider}
                            </span>
                          </div>
                          <span className="text-xs bg-surface-subtle text-ink-secondary px-2 py-1 rounded border border-surface-border">
                            Saved
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-surface-border my-4"></div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-ink mb-3">
                  Available Payment Methods
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => void handlePaymentMethodSelect(method.id)}
                      className={`p-4 border-2 rounded-lg transition text-left ${
                        paymentState.paymentMethod === method.id
                          ? 'border-primary bg-primary/10'
                          : 'border-surface-border hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {method.icon}
                          <div>
                            <p className="font-medium text-ink">{method.label}</p>
                            <p className="text-xs text-ink-secondary">{method.provider}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-ink-secondary">
                          {method.fees}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {paymentState.paymentMethod && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveFuturePayment}
                    onChange={(event) => setSaveFuturePayment(event.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm text-ink-secondary">
                    Save this payment method for future purchases
                  </span>
                </label>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-border rounded-lg text-ink font-medium hover:bg-surface-hover transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!paymentState.paymentMethod}
                  className="flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-surface border border-surface-border rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-ink mb-6">
              Review Payment
            </h2>

            <div className="space-y-6">
              <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-ink mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Subtotal:</span>
                    <span className="font-medium text-ink">
                      {currencyService.formatCurrency(paymentState.amount, paymentState.currency)}
                    </span>
                  </div>
                  {paymentContext ? (
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Property:</span>
                      <span className="font-medium text-ink text-right">
                        {paymentContext.propertyLabel}
                      </span>
                    </div>
                  ) : null}
                  <div className="border-t border-surface-border pt-3 flex justify-between">
                    <span className="text-ink-secondary">Processing Fee:</span>
                    <span className="font-medium text-ink">
                      {currencyService.formatCurrency(paymentState.feesCalculated, paymentState.currency)}
                    </span>
                  </div>
                  <div className="border-t border-surface-border pt-3 flex justify-between text-lg">
                    <span className="font-bold text-ink">Total Amount:</span>
                    <span className="font-bold text-primary">
                      {currencyService.formatCurrency(paymentState.totalAmount, paymentState.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-surface-border rounded-lg p-4">
                <p className="text-sm text-ink-secondary mb-2">Payment Method</p>
                <p className="font-semibold text-ink">
                  {paymentState.selectedPaymentInfo?.label}
                </p>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-ink">
                  Your payment information is encrypted and secure. We use industry-standard security
                  protocols.
                </p>
              </div>

              <div className="rounded-lg border border-surface-border p-4 text-sm text-ink-secondary">
                <p className="mb-2 font-semibold text-ink">
                  {t("compliance.payment.regulatoryNotice")}
                </p>
                <ul className="list-disc space-y-1 pl-5 text-ink-secondary">
                  {realEstateComplianceService
                    .getPaymentComplianceDisclosures(paymentContext?.jurisdictionId || 'GLOBAL')
                    .disclosures.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                </ul>
              </div>

              <LegalAcceptanceCheckbox
                scope="payment_checkout"
                checked={paymentTermsAccepted}
                onChange={setPaymentTermsAccepted}
                id="payment-checkout-terms"
                className="rounded-lg border border-surface-border p-4 text-ink"
              />

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 border border-border rounded-lg text-ink font-medium hover:bg-surface-hover transition"
                >
                  Back
                </button>
                <button
                  onClick={() => void processPayment()}
                  disabled={loading || !paymentTermsAccepted}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirm Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-surface border border-surface-border rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-ink mb-2">
                Payment Successful!
              </h2>
              <p className="text-ink-secondary">
                Your transaction has been processed successfully.
              </p>
            </div>

            <div className="bg-surface-subtle border border-surface-border rounded-lg p-6 mb-6 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Amount Paid:</span>
                <span className="font-semibold text-ink">
                  {currencyService.formatCurrency(paymentState.totalAmount, paymentState.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Payment Method:</span>
                <span className="font-semibold text-ink">
                  {paymentState.selectedPaymentInfo?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Status:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">Completed</span>
              </div>
            </div>

            <button
              onClick={() => onSuccess(completedTransactionId || `${listingId}-${Date.now()}`)}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function getPaymentIcon(provider: string) {
  switch (provider.toLowerCase()) {
    case 'payangels':
      return <CreditCard className="w-5 h-5 text-blue-600" />
    case 'paypal':
      return <CreditCard className="w-5 h-5 text-blue-700" />
    case 'apple_pay':
      return <CreditCard className="w-5 h-5 text-gray-800" />
    case 'google_pay':
      return <CreditCard className="w-5 h-5 text-blue-500" />
    case 'payangels':
    case 'mtn_momo':
    case 'airtel_money':
    case 'mpesa':
      return <DollarSign className="w-5 h-5 text-orange-600" />
    default:
      return <CreditCard className="w-5 h-5 text-gray-600" />
  }
}
