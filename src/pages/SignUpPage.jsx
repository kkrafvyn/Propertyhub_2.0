import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import DesktopShell from '../components/DesktopShell'
import { useAuth } from '../context/AuthContext'
import { USER_ROLES } from '../platform/registry'
import { getRoleHomePath } from '../lib/roles'

const roleOptions = [
  { value: USER_ROLES.BUYER, label: 'Buyer' },
  { value: USER_ROLES.RENTER, label: 'Renter' },
  { value: USER_ROLES.INVESTOR, label: 'Investor' },
  { value: USER_ROLES.INDEPENDENT_AGENT, label: 'Independent agent' },
  { value: USER_ROLES.AGENCY_OWNER, label: 'Agency owner' },
  { value: USER_ROLES.PROPERTY_OWNER, label: 'Property owner' },
  { value: USER_ROLES.PROPERTY_MANAGER, label: 'Property manager' },
  { value: USER_ROLES.DEVELOPER, label: 'Developer' },
  { value: USER_ROLES.ENTERPRISE_OPERATOR, label: 'Enterprise operator' },
]

export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(USER_ROLES.BUYER)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signUp(email, password, { display_name: name, role })
      const user = result?.user ?? { user_metadata: { role } }
      navigate(getRoleHomePath(user) || '/', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not create your account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DesktopShell minimal>
      <div className="mx-auto max-w-md py-12">
        <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-2 text-ink-secondary">Join BaytMiftah to save listings and book viewings.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <Field label="Full name">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-dark"
              placeholder="Your name"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-dark"
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-dark"
              placeholder="At least 8 characters"
            />
          </Field>

          <Field label="I am a">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-dark"
            >
              {roleOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-dark py-3.5 text-sm font-semibold text-brand transition hover:bg-ink disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-dark underline">
            Log in
          </Link>
        </p>
      </div>
    </DesktopShell>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}
