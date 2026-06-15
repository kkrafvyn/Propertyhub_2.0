import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import PaymentProviderPicker from '../../components/PaymentProviderPicker'
import IntegrationsBanner from '../../components/IntegrationsBanner'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from '../../i18n/LocaleContext'
import {
  fetchRentPayments,
  getAutopayEnabled,
  setAutopayEnabled,
  triggerRentDueReminders,
} from '../../services/renter-service'
import { payRent } from '../../services/payments-service'
import { initiateUssdPayment } from '../../services/ussd-service'
import { getDefaultProvider } from '../../lib/payment-providers'

function Payments() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [provider, setProvider] = useState(getDefaultProvider())
  const [momoProvider, setMomoProvider] = useState('mtn')
  const [autopay, setAutopay] = useState(getAutopayEnabled())
  const [loading, setLoading] = useState(null)
  const [ussdModal, setUssdModal] = useState(null)
  const [message, setMessage] = useState(params.get('paid') ? 'Payment recorded — thank you!' : '')

  useEffect(() => {
    fetchRentPayments().then(({ payments: rows }) => {
      setPayments(rows)
      if (user?.email) triggerRentDueReminders(rows, user.email)
    })
  }, [user?.email])

  async function handlePay(p, isAutopay = false) {
    setLoading(p.id)
    setMessage('')
    const result = await payRent({
      paymentId: p.id,
      amount: p.amount,
      provider,
      metadata: { period: p.period, autopay: isAutopay },
    })
    if (!result.checkout_url) {
      setMessage(result.message || (isAutopay ? 'Autopay initiated.' : 'Payment initiated.'))
    }
    setLoading(null)
  }

  async function handleUssd(p) {
    setLoading(p.id)
    const result = await initiateUssdPayment({
      paymentId: p.id,
      amount: p.amount,
      phone: user?.user_metadata?.phone || '',
      provider: momoProvider,
    })
    setUssdModal({ payment: p, ussd: result.ussd, message: result.message, provider: momoProvider })
    setLoading(null)
  }

  function toggleAutopay() {
    const next = setAutopayEnabled(!autopay)
    setAutopay(next)
    setMessage(next ? 'Autopay enabled — due rent will use your selected provider.' : 'Autopay disabled.')
  }

  return (
    <RenterShell titleKey="hubs.renter.payments.title" subtitleKey="hubs.renter.payments.subtitle">
      <IntegrationsBanner showPayments />
      {message && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-surface-hover px-4 py-3 text-sm text-ink">{message}</p>
      )}

      <div className="mb-6 max-w-xl">
        <p className="mb-2 text-sm font-semibold">Payment provider</p>
        <PaymentProviderPicker value={provider} onChange={setProvider} disabled={!!loading} />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface-subtle px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink">Autopay rent</p>
          <p className="text-xs text-ink-secondary">Pay due rent automatically via {provider}</p>
        </div>
        <button
          type="button"
          onClick={toggleAutopay}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${autopay ? 'bg-brand-accent text-white' : 'border border-surface-border bg-surface'}`}
        >
          {autopay ? 'On' : 'Off'}
        </button>
      </div>

      <div className="mb-6 max-w-xl">
        <p className="mb-2 text-sm font-semibold">MoMo provider (USSD)</p>
        <div className="flex gap-2">
          {['mtn', 'telecel'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setMomoProvider(id)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${momoProvider === id ? 'bg-brand-accent text-white' : 'border border-surface-border'}`}
            >
              {t(`extensions.ussd.${id}`)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-ink-secondary">{t('extensions.ussd.paystackHint')}</p>
      </div>

      <div className="space-y-3">
        {payments.map((p) => (
          <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 panel-card bg-surface p-4">
            <div>
              <p className="font-semibold">{p.period}</p>
              <p className="text-sm text-ink-secondary">Due {p.due}{p.method ? ` · ${p.method}` : ''}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-bold text-ink">GHS {p.amount.toLocaleString()}</p>
              {p.status === 'due' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handlePay(p)}
                    disabled={loading === p.id}
                    className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {loading === p.id ? 'Redirecting…' : 'Pay now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUssd(p)}
                    disabled={loading === p.id}
                    className="rounded-lg border border-surface-border px-4 py-2 text-sm font-semibold hover:bg-surface-hover disabled:opacity-60"
                  >
                    {t('extensions.ussd.payViaUssd')}
                  </button>
                </>
              ) : (
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/40 dark:text-green-200">Paid</span>
              )}
            </div>
          </article>
        ))}
      </div>

      {ussdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-card">
            <h3 className="text-lg font-semibold">{t('extensions.ussd.title')}</h3>
            <p className="mt-2 text-sm text-ink-secondary">{ussdModal.message || t('extensions.ussd.instructions')}</p>
            <code className="mt-4 block rounded-lg bg-surface-subtle px-4 py-3 text-center text-xl font-bold tracking-wide">{ussdModal.ussd}</code>
            <p className="mt-2 text-center text-sm text-ink-secondary">
              GHS {ussdModal.payment.amount.toLocaleString()} · {ussdModal.payment.period}
            </p>
            <button type="button" onClick={() => setUssdModal(null)} className="mt-4 w-full rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white">
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </RenterShell>
  )
}

export default function RenterPaymentsPage() {
  return <ProtectedRoute><Payments /></ProtectedRoute>
}
