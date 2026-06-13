import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'

export default function NotFoundPage() {
  return (
    <DesktopShell search={<CompactSearch />}>
      <div className="py-20 text-center">
        <p className="text-6xl font-bold text-brand">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-ink-secondary">This page doesn&apos;t exist or has been moved.</p>
        <Link
          to="/"
          className="mt-8 inline-block rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand"
        >
          Back to home
        </Link>
      </div>
    </DesktopShell>
  )
}
