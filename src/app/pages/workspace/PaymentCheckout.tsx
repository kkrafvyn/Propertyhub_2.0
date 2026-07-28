import React, { useEffect, useState } from 'react'
import { AlertCircle, Check, CreditCard, DollarSign, Loader, Lock, MapPin } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { currencyService } from '@/lib/currency.service'
import { internationalPaymentService } from '@/lib/international-payment.service'
import { paymentService } from '@/lib/payment.service'
import { listingService } from '@/lib/listing.service'
import {
  resolvePaymentContextFromListing,
  shouldUsePaystackCheckout,
  type PaymentContext,
} from '@/lib/payment-routing.service'
import { clientIntegrations } from '@/lib/integrations'
import { realEstateComplianceService } from '@/lib/real-estate-compliance.service'
import { useTranslation } from '../../i18n/LocaleContext'

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

      if (shouldUsePaystackCheckout(paymentContext)) {
        if (!clientIntegrations.paystack.checkoutReady) {
          throw new Error('Paystack checkout is not configured for this property market.')
        }

        const checkout = await paymentService.initializePropertyPayment({
          listingId,
          amount: paymentState.totalAmount,
          purpose: 'other',
        })

        if (checkout.authorizationUrl) {
          window.location.href = checkout.authorizationUrl
          return
        }

        throw new Error('Paystack checkout URL was not returned.')
      }

      if (!clientIntegrations.stripe.configured) {
        throw new Error(
          `Stripe checkout is not configured for properties in ${paymentContext.propertyLabel}.`
        )
      }

      const transaction = await internationalPaymentService.createTransaction(
        user.id,
        paymentState.amount,
        paymentState.currency,
        paymentState.selectedPaymentInfo.provider,
        paymentState.selectedPaymentInfo.methodType,
        `${listingId}-${Date.now()}`
      )

      if (saveFuturePayment) {
        await internationalPaymentService.savePaymentMethod(
          user.id,
          paymentState.selectedPaymentInfo.provider,
          {
            brand: paymentState.selectedPaymentInfo.label,
          }
        )
      }

      await internationalPaymentService.updateTransactionStatus(transaction.id, 'completed')

      setCompletedTransactionId(transaction.id)
      setStep(4)
      setLoading(false)

      setTimeout(() => {
        onSuccess(transaction.id)
      }, 1200)
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
          <div className="flex justify-between mb-6">
            {steps.map((s, idx) => (
              <div key={s.step} className="flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                      step >= s.step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {step > s.step ? <Check className="w-6 h-6" /> : s.step}
                  </div>
                  <p className="text-xs font-medium mt-2 text-center text-gray-700 dark:text-gray-300">
                    {s.title}
                  </p>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 mt-2 ${
                      step > s.step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  ></div>
                )}
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
          <div className="flex items-center justify-center rounded-lg bg-white p-12 shadow-lg dark:bg-gray-800">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : null}

        {!listingLoading && paymentContext ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">Property location</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{paymentContext.propertyLabel}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Payments for this listing use{' '}
                  <strong>{paymentContext.providerLabel}</strong> in{' '}
                  <strong>{paymentContext.currency}</strong>.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 && !listingLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Payment Amount
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount ({paymentState.currency})
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment provider:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {paymentContext?.providerLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Amount in {paymentState.currency}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currencyService.formatCurrency(paymentState.amount, paymentState.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={onCancel}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={paymentState.amount <= 0 || paymentMethods.length === 0}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Select Payment Method
            </h2>

            <div className="space-y-6">
              {savedMethods.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Saved Payment Methods
                  </h3>
                  <div className="space-y-2">
                    {savedMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => void handlePaymentMethodSelect(method.payment_provider)}
                        className={`w-full p-4 border-2 rounded-lg transition text-left ${
                          paymentState.paymentMethod === method.payment_provider
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-gray-600" />
                            <span className="font-medium">
                              {method.method_details?.brand || method.payment_provider}
                            </span>
                          </div>
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            Saved
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Available Payment Methods
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => void handlePaymentMethodSelect(method.id)}
                      className={`p-4 border-2 rounded-lg transition text-left ${
                        paymentState.paymentMethod === method.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {method.icon}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{method.label}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{method.provider}</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Save this payment method for future purchases
                  </span>
                </label>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!paymentState.paymentMethod}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Review Payment
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Review Payment
            </h2>

            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currencyService.formatCurrency(paymentState.amount, paymentState.currency)}
                    </span>
                  </div>
                  {paymentContext ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Property:</span>
                      <span className="font-medium text-gray-900 dark:text-white text-right">
                        {paymentContext.propertyLabel}
                      </span>
                    </div>
                  ) : null}
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Processing Fee:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currencyService.formatCurrency(paymentState.feesCalculated, paymentState.currency)}
                    </span>
                  </div>
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between text-lg">
                    <span className="font-bold text-gray-900 dark:text-white">Total Amount:</span>
                    <span className="font-bold text-blue-600">
                      {currencyService.formatCurrency(paymentState.totalAmount, paymentState.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Payment Method</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {paymentState.selectedPaymentInfo?.label}
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  Your payment information is encrypted and secure. We use industry-standard security
                  protocols.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-300">
                <p className="mb-2 font-semibold text-gray-900 dark:text-white">
                  {t("compliance.payment.regulatoryNotice")}
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  {realEstateComplianceService
                    .getPaymentComplianceDisclosures(paymentContext?.jurisdictionId || 'GLOBAL')
                    .disclosures.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                </ul>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => void processPayment()}
                  disabled={loading}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your transaction has been processed successfully.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount Paid:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {currencyService.formatCurrency(paymentState.totalAmount, paymentState.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {paymentState.selectedPaymentInfo?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className="font-semibold text-green-600">Completed</span>
              </div>
            </div>

            <button
              onClick={() => onSuccess(completedTransactionId || `${listingId}-${Date.now()}`)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
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
    case 'stripe':
      return <CreditCard className="w-5 h-5 text-blue-600" />
    case 'paypal':
      return <CreditCard className="w-5 h-5 text-blue-700" />
    case 'apple_pay':
      return <CreditCard className="w-5 h-5 text-gray-800" />
    case 'google_pay':
      return <CreditCard className="w-5 h-5 text-blue-500" />
    case 'paystack':
    case 'flutterwave':
    case 'mtn_momo':
    case 'airtel_money':
    case 'mpesa':
      return <DollarSign className="w-5 h-5 text-orange-600" />
    default:
      return <CreditCard className="w-5 h-5 text-gray-600" />
  }
}
