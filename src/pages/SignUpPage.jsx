import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import AuthPageLayout from '../components/AuthPageLayout'
import OAuthButtons, { AuthDivider } from '../components/OAuthButtons'
import { Field, inputClass, selectClass } from '../components/ui/AirbnbUI'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from '../i18n/LocaleContext'
import { USER_ROLES } from '../platform/registry'
import { getRoleHomePath } from '../lib/roles'
import { isSupabaseConfigured } from '../lib/supabase'

const roleOptions = [
  USER_ROLES.BUYER,
  USER_ROLES.RENTER,
  USER_ROLES.INVESTOR,
  USER_ROLES.INDEPENDENT_AGENT,
  USER_ROLES.AGENCY_OWNER,
  USER_ROLES.PROPERTY_OWNER,
  USER_ROLES.PROPERTY_MANAGER,
  USER_ROLES.DEVELOPER,
  USER_ROLES.ENTERPRISE_OPERATOR,
]

export default function SignUpPage() {
  const { signUp, signInWithOAuth } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState(USER_ROLES.BUYER)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthProvider, setOauthProvider] = useState(null)

  const oauthMetadata = { display_name: name || undefined, role }

  async function handleOAuth(provider) {
    setError('')
    setOauthProvider(provider)
    try {
      await signInWithOAuth(provider, {
        redirectPath: getRoleHomePath({ user_metadata: { role } }) || '/',
        metadata: oauthMetadata,
      })
    } catch (err) {
      setError(err.message || `Could not sign up with ${provider}.`)
      setOauthProvider(null)
    }
  }

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
    <AuthPageLayout>
      <div className="mx-auto max-w-[568px] rounded-2xl border border-surface-border bg-surface p-6 shadow-card md:p-8">
        <h1 className="text-2xl font-semibold text-ink">{t('auth.finishSignup')}</h1>

        <Field label={t('auth.iAmA')} className="mt-6">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={selectClass}
          >
            {roleOptions.map((value) => (
              <option key={value} value={value}>{t(`roles.${value}`)}</option>
            ))}
          </select>
        </Field>

        {isSupabaseConfigured && (
          <>
            <div className="mt-4">
              <OAuthButtons
                loadingProvider={oauthProvider}
                disabled={loading}
                onGoogle={() => handleOAuth('google')}
                onApple={() => handleOAuth('apple')}
              />
            </div>
            <AuthDivider />
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('auth.fullName')}>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder={t('auth.yourName')}
            />
          </Field>

          <Field label={t('auth.email')}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder={t('auth.email')}
            />
          </Field>

          <Field label={t('auth.password')}>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder={t('auth.passwordMin')}
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || oauthProvider}
            className="w-full rounded-lg bg-brand-accent py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? t('auth.creatingAccount') : t('auth.agreeContinue')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-secondary">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="font-semibold text-ink underline">
            {t('auth.logIn')}
          </Link>
        </p>
      </div>
    </AuthPageLayout>
  )
}
