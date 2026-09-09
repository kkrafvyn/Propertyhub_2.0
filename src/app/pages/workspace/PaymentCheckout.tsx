import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  Check,
  CreditCard,
  DollarSign,
  Loader,
  Lock,
  MapPin,
  Smartphone,
  ShieldCheck,
  Zap,
  ChevronLeft,
  Landmark,
  Wallet,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
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

// ── Types ────────────────────────────────────────────────────────────────────

type PaymentMethodType = 'card' | 'bank_transfer' | 'mobile_money' | 'wallet' | 'crypto' | 'buy_now_pay_later'

interface CheckoutPaymentMethod {
  id: string
  provider: string
  methodType: PaymentMethodType
  label: string
  icon: React.ReactNode
  fees: number
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFeeSummary(amount: number, providerId?: string) {
  if (!providerId) return { subtotal: amount, fee: 0, total: amount }
  return internationalPaymentService.calculateFees(amount, providerId)
}

function getPaymentIcon(provider: string, size = 'w-5 h-5') {
  const p = provider.toLowerCase()
  if (p === 'payangels' || p === 'card') return <CreditCard className={`${size} text-blue-600`} />
  if (p === 'mtn_momo' || p === 'airtel_money' || p === 'mpesa' || p === 'mobile_money') return <Smartphone className={`${size} text-orange-500`} />
  if (p === 'bank_transfer') return <Landmark className={`${size} text-indigo-600`} />
  if (p === 'wallet') return <Wallet className={`${size} text-violet-600`} />
  return <CreditCard className={`${size} text-muted-foreground`} />
}

// ── Step progress bar ─────────────────────────────────────────────────────────

const STEPS = ['Amount', 'Method', 'Review', 'Done']

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 w-full mb-8">
      {STEPS.map((label, i) => {
        const num = i + 1
        const done = step > num
        const active = step === num
        const isLast = i === STEPS.length - 1
        return (
          <div key={label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300
                ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-background border-muted-foreground/20 text-muted-foreground'}`}>
                {done ? <Check className="w-4 h-4" /> : num}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium transition-colors ${done || active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
            </div>
            {!isLast && <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-colors duration-500 ${done ? 'bg-emerald-500' : 'bg-muted-foreground/15'}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Trust badges ──────────────────────────────────────────────────────────────

function TrustBadges() {
  return (
    <div className="flex flex-wrap gap-3 justify-center pt-2">
      {[
        { icon: <Lock className="w-3.5 h-3.5" />, label: '256-bit SSL' },
        { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'PCI-DSS Compliant' },
        { icon: <Zap className="w-3.5 h-3.5" />, label: 'Instant Settlement' },
      ].map((b) => (
        <span key={b.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border rounded-full px-3 py-1">
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  )
}

// ── Method tile ───────────────────────────────────────────────────────────────

function MethodTile({
  method,
  selected,
  onSelect,
}: {
  method: CheckoutPaymentMethod
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200
        ${selected
          ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border hover:border-primary/40 hover:bg-muted/30'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl transition-colors ${selected ? 'bg-primary/10' : 'bg-muted/50'}`}>
            {method.icon}
          </div>
          <div>
            <p className="font-semibold text-sm">{method.label}</p>
            <p className="text-xs text-muted-foreground">{method.provider}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">
            {method.fees > 0 ? `+${method.fees}% fee` : 'No fee'}
          </span>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
            ${selected ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
            {selected && <Check className="w-3 h-3 text-primary-foreground" />}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

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
    async function load() {
      try {
        setListingLoading(true)
        const listing = await listingService.getListingForPayment(listingId)
        if (!listing) throw new Error('Listing not found')
        const context = resolvePaymentContextFromListing(listing)
        if (cancelled) return
        setPaymentContext(context)
        const listingAmount = listing.price ? Number(listing.price) : baseAmountUsd
        const amount = context.currency === 'USD' ? baseAmountUsd : listingAmount || baseAmountUsd
        setPaymentState((prev) => ({ ...prev, currency: context.currency, region: context.region, amount, totalAmount: amount }))
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load property payment details')
      } finally {
        if (!cancelled) setListingLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [baseAmountUsd, listingId])

  useEffect(() => {
    if (!paymentContext) return
    void loadPaymentMethods()
  }, [paymentContext, user?.id])

  async function loadPaymentMethods() {
    if (!paymentContext) return
    try {
      const config = internationalPaymentService.getPaymentConfigForProperty(paymentContext)
      const methods: CheckoutPaymentMethod[] = config.availableMethods.map((m) => ({
        id: m.id, provider: m.id, methodType: m.type, label: m.name,
        icon: getPaymentIcon(m.id),
        fees: m.commissionPercentage,
      }))
      setPaymentMethods(methods)
      if (methods.length > 0) {
        const def = methods.find((m) => m.id === config.defaultMethod) || methods[0]
        const fs = getFeeSummary(paymentState.amount, def.provider)
        setPaymentState((prev) => ({ ...prev, paymentMethod: def.id, selectedPaymentInfo: def, feesCalculated: fs.fee, totalAmount: fs.total }))
      }
      if (user?.id) {
        const saved = await internationalPaymentService.getUserPaymentMethods(user.id)
        setSavedMethods(saved || [])
      }
    } catch {
      setError('Failed to load payment methods')
    }
  }

  function handleMethodSelect(methodId: string) {
    const selected = paymentMethods.find((m) => m.id === methodId)
    if (!selected) return
    const fs = getFeeSummary(paymentState.amount, selected.provider)
    setPaymentState((prev) => ({ ...prev, paymentMethod: methodId, selectedPaymentInfo: selected, feesCalculated: fs.fee, totalAmount: fs.total }))
  }

  async function processPayment() {
    setLoading(true)
    setError(null)
    try {
      if (!user?.id) throw new Error('Sign in before processing a payment.')
      if (!paymentContext) throw new Error('Property payment details are still loading.')
      if (!paymentState.selectedPaymentInfo) throw new Error('Choose a payment method before continuing.')
      if (!paymentTermsAccepted) throw new Error('Please accept the Payments & Transaction Processing Policy before continuing.')

      await legalAcceptanceService.recordAcceptance({
        userId: user.id, scope: 'payment_checkout',
        policySlugs: ACCEPTANCE_SCOPES.payment_checkout.policySlugs,
        policyVersion: LEGAL_POLICY_VERSION,
      })

      if (!clientIntegrations.payangels.checkoutReady) {
        throw new Error(`Checkout is not configured for properties in ${paymentContext.propertyLabel}.`)
      }

      const checkout = await paymentService.initializePropertyPayment({ listingId, amount: paymentState.totalAmount, purpose: 'other' })
      if (checkout.simulated || String(checkout.accessCode || '').startsWith('sim_')) {
        throw new Error('Checkout is not configured for live payments.')
      }

      let paid = false
      await openPayAngelsInline({
        email: user.email!,
        amountMinor: Math.round(paymentState.totalAmount * 100),
        currency: paymentContext.currency,
        reference: checkout.reference,
        accessCode: checkout.accessCode,
        onClose: () => { if (!paid) setLoading(false) },
        onSuccess: async (reference) => {
          paid = true
          const result = await paymentService.verifyCheckoutReturn({ reference })
          if (result.status !== 'success' && result.status !== 'completed') throw new Error('Payment verification failed.')
          setCompletedTransactionId(result.transaction?.id || reference)
          setStep(4)
          onSuccess(result.transaction?.id || reference)
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment processing failed')
      setLoading(false)
    }
  }

  const fmt = (n: number) => currencyService.formatCurrency(n, paymentState.currency)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 dark:from-slate-950 dark:via-indigo-950/20 dark:to-violet-950/10 p-4 flex items-center justify-center">
      <div className="w-full max-w-lg">

        {/* ── Card shell ── */}
        <div className="bg-background/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-border overflow-hidden">

          {/* Header gradient band */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" style={{ width: `${(step / 4) * 100}%`, transition: 'width 0.5s ease' }} />

          <div className="p-6 sm:p-8">
            <StepBar step={step} />

            {/* Error banner */}
            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Loading */}
            {listingLoading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading payment details…</p>
              </div>
            )}

            {/* Context banner */}
            {!listingLoading && paymentContext && (
              <div className="mb-6 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-500/5 p-4 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">{paymentContext.propertyLabel}</p>
                  <p className="text-muted-foreground mt-0.5">Payments processed in <strong className="text-foreground">{paymentState.currency}</strong></p>
                </div>
              </div>
            )}

            {/* ── Step 1: Amount ── */}
            {step === 1 && !listingLoading && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-1">Confirm Amount</h2>
                  <p className="text-sm text-muted-foreground">Review the payment amount for this property.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Amount ({paymentState.currency})</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="number"
                      value={paymentState.amount}
                      onChange={(e) => {
                        const next = Number.parseFloat(e.target.value) || 0
                        const fs = getFeeSummary(next, paymentState.selectedPaymentInfo?.provider)
                        setPaymentState((prev) => ({ ...prev, amount: next, feesCalculated: fs.fee, totalAmount: fs.total }))
                      }}
                      className="w-full pl-11 pr-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-primary/30 outline-none bg-background text-foreground text-lg font-bold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{fmt(paymentState.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Processing fee (varies by method)</span>
                    <span>Calculated next step</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={onCancel} className="flex-1 py-3 border border-border rounded-xl font-medium hover:bg-muted/40 transition-colors text-sm">Cancel</button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={paymentState.amount <= 0 || paymentMethods.length === 0}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  >
                    Choose Method
                  </button>
                </div>

                <TrustBadges />
              </div>
            )}

            {/* ── Step 2: Method ── */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold mb-1">Payment Method</h2>
                  <p className="text-sm text-muted-foreground">Choose how you would like to pay.</p>
                </div>

                {savedMethods.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Saved Methods</p>
                    <div className="space-y-2">
                      {savedMethods.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleMethodSelect(m.payment_provider)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all
                            ${paymentState.paymentMethod === m.payment_provider ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium text-sm">{m.method_details?.brand || m.payment_provider}</span>
                            <span className="ml-auto text-xs text-muted-foreground bg-muted/60 rounded-full px-2 py-0.5">Saved</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-border my-4" />
                  </div>
                )}

                <div className="space-y-2">
                  {paymentMethods.map((m) => (
                    <MethodTile key={m.id} method={m} selected={paymentState.paymentMethod === m.id} onSelect={() => handleMethodSelect(m.id)} />
                  ))}
                </div>

                {paymentState.paymentMethod && (
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={saveFuturePayment} onChange={(e) => setSaveFuturePayment(e.target.checked)} className="rounded border-border" />
                    <span className="text-muted-foreground">Save this method for future payments</span>
                  </label>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 py-3 px-5 border border-border rounded-xl font-medium hover:bg-muted/40 transition-colors text-sm">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!paymentState.paymentMethod}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-40 text-sm"
                  >
                    Review Payment
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Review ── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold mb-1">Review &amp; Confirm</h2>
                  <p className="text-sm text-muted-foreground">Check your order before processing payment.</p>
                </div>

                {/* Order summary */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
                  <p className="font-bold mb-3">Order Summary</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{fmt(paymentState.amount)}</span>
                  </div>
                  {paymentContext && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Property</span>
                      <span className="font-medium text-right max-w-[60%]">{paymentContext.propertyLabel}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-medium">{fmt(paymentState.feesCalculated)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
                    <span>Total</span>
                    <span className="text-primary">{fmt(paymentState.totalAmount)}</span>
                  </div>
                </div>

                {/* Method */}
                <div className="rounded-xl border border-border p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted/50">
                    {getPaymentIcon(paymentState.selectedPaymentInfo?.provider || '', 'w-5 h-5')}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Method</p>
                    <p className="font-semibold text-sm">{paymentState.selectedPaymentInfo?.label}</p>
                  </div>
                </div>

                {/* Security */}
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-500/5 p-3 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Your payment is encrypted with 256-bit SSL. We never store card details.
                  </p>
                </div>

                {/* Compliance */}
                <div className="rounded-xl border border-border p-4 text-xs text-muted-foreground space-y-1.5">
                  <p className="font-semibold text-foreground text-sm">{t('compliance.payment.regulatoryNotice')}</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {realEstateComplianceService
                      .getPaymentComplianceDisclosures(paymentContext?.jurisdictionId || 'GLOBAL')
                      .disclosures.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </div>

                <LegalAcceptanceCheckbox
                  scope="payment_checkout"
                  checked={paymentTermsAccepted}
                  onChange={setPaymentTermsAccepted}
                  id="payment-checkout-terms"
                  className="rounded-xl border border-border p-4"
                />

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 py-3 px-5 border border-border rounded-xl font-medium hover:bg-muted/40 transition-colors text-sm">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => void processPayment()}
                    disabled={loading || !paymentTermsAccepted}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading
                      ? <><Loader className="w-4 h-4 animate-spin" />Processing…</>
                      : <><Lock className="w-4 h-4" />Confirm &amp; Pay</>}
                  </button>
                </div>

                <TrustBadges />
              </div>
            )}

            {/* ── Step 4: Success ── */}
            {step === 4 && (
              <div className="text-center space-y-5 py-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-4 border-emerald-500/20 flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold">Payment Successful!</h2>
                  <p className="text-muted-foreground text-sm mt-1">Your transaction has been processed and confirmed.</p>
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-left space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold text-emerald-600">{fmt(paymentState.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-medium">{paymentState.selectedPaymentInfo?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-emerald-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Completed</span>
                  </div>
                </div>

                <button
                  onClick={() => onSuccess(completedTransactionId || `${listingId}-${Date.now()}`)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-all"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
