import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'

export default function PaymentCancelPage() {
  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="text-2xl font-semibold">Payment cancelled</h1>
        <p className="mt-2 text-ink-secondary">No charge was made. You can try again anytime.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/finance" className="rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand">Finance hub</Link>
          <Link to="/" className="rounded-lg border border-surface-border px-6 py-3 text-sm font-semibold">Home</Link>
        </div>
      </div>
    </DesktopShell>
  )
}
