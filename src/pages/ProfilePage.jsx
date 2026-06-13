import { Link } from 'react-router-dom'
import DesktopShell, { CompactSearch } from '../components/DesktopShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../context/AuthContext'

function ProfileContent() {
  const { user, role, signOut } = useAuth()

  return (
    <DesktopShell search={<CompactSearch />}>
      <h1 className="text-2xl font-semibold">Profile</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-card border border-surface-border bg-surface p-6 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-dark text-2xl font-bold text-brand">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <p className="mt-4 font-semibold">{user?.user_metadata?.display_name || 'BaytMiftah member'}</p>
          <p className="text-sm text-ink-secondary">{user?.email}</p>
        </div>

        <div className="space-y-4">
          <Section title="Account">
            <Row label="Email" value={user?.email} />
            <Row label="Role" value={role || 'buyer'} />
          </Section>
          <Section title="Platforms">
            <NavRow to="/buyer" label="Buyer workspace" />
            <NavRow to="/agent" label="Agent CRM" />
            <NavRow to="/agency" label="Agency ERP" />
            <NavRow to="/renter" label="Renter workspace" />
            <NavRow to="/manage" label="Property management" />
            <NavRow to="/smart" label="Smart property" />
            <NavRow to="/finance" label="Financial services" />
            <NavRow to="/intelligence" label="Intelligence hub" />
            <NavRow to="/developer" label="Developer platform" />
            <NavRow to="/enterprise" label="Enterprise assets" />
            <NavRow to="/admin" label="Admin & trust" />
          </Section>
          <Section title="Workspace">
            <NavRow to="/trips" label="Trips & viewings" />
            <NavRow to="/transactions" label="Transaction center" />
            <NavRow to="/buyer/advisor" label="AI buyer advisor" />
            <NavRow to="/saved" label="Saved homes" />
            <NavRow to="/documents" label="Document vault" />
            <NavRow to="/agency" label="Agency dashboard" />
          </Section>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-surface-border px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface-subtle"
          >
            Log out
          </button>
        </div>
      </div>
    </DesktopShell>
  )
}

function Section({ title, children }) {
  return (
    <div className="rounded-card border border-surface-border bg-surface p-5">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-secondary">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function NavRow({ to, label }) {
  return (
    <Link to={to} className="flex justify-between text-sm font-medium text-brand-dark hover:underline">
      {label}
      <span>→</span>
    </Link>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
