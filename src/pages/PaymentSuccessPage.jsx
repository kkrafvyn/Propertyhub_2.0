import { Link, useSearchParams } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { IconCheck } from '../components/icons'

export default function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const provider = params.get('provider') || 'payment'

  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
          <IconCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Payment successful</h1>
        <p className="mt-2 text-ink-secondary">
          Your {provider} payment was received. It may take a moment to reflect in your account once webhooks process.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/trips" className="rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand">View trips</Link>
          <Link to="/renter/payments" className="rounded-lg border border-surface-border px-6 py-3 text-sm font-semibold">Renter payments</Link>
          <Link to="/" className="rounded-lg border border-surface-border px-6 py-3 text-sm font-semibold">Home</Link>
        </div>
      </div>
    </DesktopShell>
  )
}
