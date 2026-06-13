import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import DesktopShell from '../components/DesktopShell'
import { useAuth } from '../context/AuthContext'
import { getRoleHomePath } from '../lib/roles'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)
      const user = result?.user
      const destination = redirectTo || getRoleHomePath(user) || '/'
      navigate(destination, { replace: true })
    } catch (err) {
      setError(err.message || 'Could not sign in. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <DesktopShell minimal>
      <div className="mx-auto max-w-md py-12">
        <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-2 text-ink-secondary">Log in to save homes and request viewings.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-surface-border px-4 py-3 text-sm outline-none focus:border-brand-dark"
              placeholder="Your password"
            />
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
            {loading ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-brand-dark underline">
            Sign up
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
