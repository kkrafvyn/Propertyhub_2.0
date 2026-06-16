import { useEffect, useState } from 'react'
import RenterShell from '../../components/RenterShell'
import ProtectedRoute from '../../components/ProtectedRoute'
import { fetchTenantScore } from '../../services/tenant-intelligence-service'
import { useTranslation } from '../../i18n/LocaleContext'

const TIPS = [
  { band: 'approved', text: 'You qualify for reduced deposit on new leases. Keep paying on time to maintain this status.' },
  { band: 'standard', text: 'Pay rent and utilities before the due date to boost your housing credit score.' },
  { band: 'elevated', text: 'Your score is below average. Pay all outstanding bills and avoid late payments for 3 months.' },
  { band: 'high_risk', text: 'Manual review may be required for new leases. Clear arrears and enable autopay to recover.' },
  { band: 'reject', text: 'Significant payment issues detected. Contact your landlord to arrange a payment plan.' },
]

function CreditPage() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchTenantScore(true).then(setData)
  }, [])

  const profile = data?.profile
  const tip = TIPS.find((t) => t.band === profile?.risk_band) ?? TIPS[1]

  return (
    <RenterShell titleKey="hubs.renter.credit.title" subtitleKey="hubs.renter.credit.subtitle">
      {!profile ? (
        <p className="text-sm text-ink-secondary">Loading credit profile…</p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="panel-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase text-ink-secondary">Credit score</p>
              <p className="text-3xl font-bold text-ink">{profile.credit_score}</p>
              <p className="text-xs text-ink-secondary">300 – 850 scale</p>
            </div>
            <div className="panel-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase text-ink-secondary">Risk band</p>
              <p className="text-xl font-bold capitalize text-ink">{profile.risk_band?.replace(/_/g, ' ')}</p>
            </div>
            <div className="panel-card bg-surface p-4">
              <p className="text-xs font-semibold uppercase text-ink-secondary">Deposit multiplier</p>
              <p className="text-xl font-bold text-ink">{profile.deposit_multiplier}×</p>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-brand/30 bg-surface-hover p-4">
            <p className="font-semibold">{data.recommendation}</p>
            <p className="mt-2 text-sm text-ink-secondary">{tip.text}</p>
          </div>

          <h2 className="mb-3 font-semibold">Payment history</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={t('hubs.renter.credit.stats.onTime')} value={profile.on_time_payments} good />
            <Stat label={t('hubs.renter.credit.stats.late')} value={profile.late_payments} />
            <Stat label={t('hubs.renter.credit.stats.missed')} value={profile.missed_payments} bad={profile.missed_payments > 0} />
          </div>
        </>
      )}
    </RenterShell>
  )
}

function Stat({ label, value, good, bad }) {
  return (
    <div className={`panel-card p-4 ${good ? 'bg-green-50 dark:bg-green-900/20' : bad ? 'bg-red-50 dark:bg-red-900/20' : 'bg-surface'}`}>
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}

export default function RenterCreditPage() {
  return <ProtectedRoute><CreditPage /></ProtectedRoute>
}
