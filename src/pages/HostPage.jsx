import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import { useAuth } from '../context/AuthContext'

export default function HostPage() {
  const { user } = useAuth()
  const location = useLocation()
  const listed = location.state?.listed

  if (!user) {
    return (
      <DesktopShell search={<CompactSearch />}>
        <div className="mx-auto max-w-xl py-16 text-center">
          <h1 className="text-3xl font-semibold text-ink">List your property</h1>
          <p className="mt-4 text-ink-secondary">
            Sign in to start listing your home, apartment, or commercial space.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/login"
              className="rounded-lg border border-surface-border px-6 py-3 text-sm font-semibold text-ink hover:bg-surface-subtle"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-brand-dark px-6 py-3 text-sm font-semibold text-brand hover:bg-ink"
            >
              Sign up
            </Link>
          </div>
        </div>
      </DesktopShell>
    )
  }

  return (
    <DesktopShell search={<CompactSearch />}>
      {listed && (
        <p className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Listing submitted for review. Our team will verify and publish it shortly.
        </p>
      )}
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h1 className="text-3xl font-semibold leading-tight text-ink">
            List your property on BaytMiftah
          </h1>
          <p className="mt-4 text-lg text-ink-secondary">
            Reach verified buyers and renters across Ghana. Our team reviews every listing
            for quality and trust.
          </p>
          <ul className="mt-8 space-y-3 text-ink-secondary">
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Professional photos and verified address
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Agency dashboard for leads and viewings
            </li>
            <li className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Secure document vault for transactions
            </li>
          </ul>
          <Link
            to="/host/list"
            className="mt-8 inline-block rounded-lg bg-brand-dark px-8 py-3.5 text-sm font-semibold text-brand transition hover:bg-ink"
          >
            Get started
          </Link>
          <Link
            to="/host/listings"
            className="ml-4 mt-8 inline-block rounded-lg border border-surface-border px-8 py-3.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
          >
            Your listings
          </Link>
          <Link
            to="/host/boost"
            className="ml-4 mt-8 inline-block rounded-lg border border-surface-border px-8 py-3.5 text-sm font-semibold text-ink transition hover:bg-surface-subtle"
          >
            Feature your listing
          </Link>
        </div>

        <div className="overflow-hidden rounded-card shadow-card">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
            alt="Modern property"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </DesktopShell>
  )
}
